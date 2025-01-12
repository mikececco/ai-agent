import {
  AIMessage,
  BaseMessage,
  HumanMessage,
  SystemMessage,
  trimMessages,
} from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import { Serialized } from "@langchain/core/load/serializable";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";

// Trim the messages to manage conversation history
const trimmer = trimMessages({
  maxTokens: 10,
  strategy: "last",
  tokenCounter: (msgs) => msgs.length,
  includeSystem: true,
  allowPartial: false,
  startOn: "human",
});

// Connect to wxflows
const toolClient = new wxflows({
  endpoint: process.env.WXFLOWS_ENDPOINT || "",
  apikey: process.env.WXFLOWS_APIKEY,
});

// Retrieve the tools
const tools = await toolClient.lcTools;
const toolNode = new ToolNode(tools);

// Connect to the LLM provider with better tool instructions
const initialiseModel = (onToken?: (token: string) => void) => {
  const model = new ChatAnthropic({
    modelName: "claude-3-5-sonnet-20241022",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
    clientOptions: {
      defaultHeaders: {
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
    },
    callbacks: [
      {
        handleLLMStart: async () => {
          console.log("🤖 Starting LLM call");
        },
        handleLLMEnd: async (output) => {
          console.log("🤖 End LLM call", output);
          const usage = output.llmOutput?.usage;
          if (usage) {
            console.log("📊 Token Usage:", {
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              total_tokens: usage.input_tokens + usage.output_tokens,
              cache_creation_input_tokens:
                usage.cache_creation_input_tokens || 0,
              cache_read_input_tokens: usage.cache_read_input_tokens || 0,
            });
          }
        },
        handleLLMNewToken: async (token: string) => {
          console.log("🔤 New token:", token);
          if (onToken) {
            await onToken(token);
          }
        },
        handleToolStart: async (
          tool: Serialized,
          input: string,
          runId: string
        ) => {
          console.log("🛠️ Tool Start:", {
            tool: typeof tool === "string" ? tool : tool.id[0],
            input: typeof input === "string" ? JSON.parse(input) : input,
            runId,
          });
        },
        handleToolEnd: async (output: string, runId: string) => {
          console.log("🛠️ Tool End:", {
            output: typeof output === "string" ? JSON.parse(output) : output,
            runId,
          });
        },
        handleToolError: async (error: Error, runId: string) => {
          console.error("🛠️ Tool Error:", {
            message: error.message,
            stack: error.stack,
            runId,
          });
        },
      },
    ],
  }).bindTools(tools);

  return model;
};

// Define the function that determines whether to continue or not
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    console.log("🔄 Tool Call Details:", {
      tool_calls: lastMessage.tool_calls.map((call) => {
        const args =
          typeof call.args === "string" ? JSON.parse(call.args) : call.args;
        console.log("📝 GraphQL Query:", {
          name: call.name,
          query: args.query,
          variables: args.variables || "{}",
          parsed_variables: args.variables ? JSON.parse(args.variables) : {},
        });
        return {
          name: call.name,
          args,
        };
      }),
    });
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Define a new graph
const createWorkflow = (chatId: string, onToken?: (token: string) => void) => {
  const model = initialiseModel(onToken);

  return new StateGraph(MessagesAnnotation)
    .addNode("agent", async (state) => {
      // Create the system message content
      const systemContent = `You are an AI assistant that uses tools to help answer questions. You have access to several tools that can help you find information and perform tasks.

When using tools:
- Only use the tools that are explicitly provided
- For GraphQL queries, ALWAYS provide necessary variables in the variables field as a JSON string
- For youtube_transcript tool, always include both videoUrl and langCode (default "en") in the variables
- For google_books tool, include q and maxResults in the variables
- Structure GraphQL queries to request all available fields shown in the schema
- Explain what you're doing when using tools
- Share the results of tool usage with the user
- Always share the output from the tool call with the user
- If a tool call fails, explain the error and try again with corrected parameters
- never create false information
- If prompt is too long, break it down into smaller parts and use the tools to answer each part
- when you do any tool call or any computation before you return the result, structure it between markers like this:
  ---START---
  query
  ---END---

Tool-specific instructions:
1. youtube_transcript:
   - Query: { transcript(videoUrl: $videoUrl, langCode: $langCode) { title captions { text start dur } } }
   - Variables: { "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID", "langCode": "en" }

2. google_books:
   - For search: { books(q: $q, maxResults: $maxResults) { volumeId title authors } }
   - Variables: { "q": "search terms", "maxResults": 5 }

   refer to previous messages for context and use them to accurately answer the question
`;

      // Create the prompt template with system message and messages placeholder
      const promptTemplate = ChatPromptTemplate.fromMessages([
        new SystemMessage(systemContent, {
          cache_control: { type: "ephemeral" },
        }),
        new MessagesPlaceholder("messages"),
      ]);

      // Trim the messages to manage conversation history
      const trimmedMessages = await trimmer.invoke(state.messages);

      // Format the prompt with the current messages
      const prompt = await promptTemplate.invoke({ messages: trimmedMessages });
      console.log("✅ Prompt:", prompt);

      // Get response from the model
      const response = await model.invoke(prompt);
      return { messages: [response] };
    })
    .addNode("tools", toolNode)
    .addEdge("__start__", "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");
};

function addCachingHeaders(messages: BaseMessage[]): BaseMessage[] {
  if (!messages.length) return messages;

  // Create a copy of messages to avoid mutating the original
  const cachedMessages = [...messages];

  // Helper to add cache control
  const addCache = (message: BaseMessage) => {
    message.content = [
      {
        type: "text",
        text: message.content as string,
        cache_control: { type: "ephemeral" },
      },
    ];
  };

  // Cache the last message
  console.log("🤑🤑🤑 Caching last message");
  addCache(cachedMessages.at(-1)!);

  // Find and cache the second-to-last human message
  let humanCount = 0;
  for (let i = cachedMessages.length - 1; i >= 0; i--) {
    if (cachedMessages[i] instanceof HumanMessage) {
      humanCount++;
      if (humanCount === 2) {
        console.log("🤑🤑🤑 Caching second-to-last human message");
        addCache(cachedMessages[i]);
        break;
      }
    }
  }

  return cachedMessages;
}

export async function submitQuestion(
  messages: BaseMessage[],
  chatId: string,
  onToken?: (token: string) => void
): Promise<string | ReadableStream<string>> {
  try {
    // Add caching headers to messages
    const cachedMessages = addCachingHeaders(messages);

    // Create workflow with chatId and onToken callback
    const workflow = createWorkflow(chatId, onToken);

    // Create a checkpoint to save the state of the conversation
    const checkpointer = new MemorySaver();
    const app = workflow.compile({ checkpointer });

    // The config is used to set the thread_id for the conversation
    const config = { configurable: { thread_id: chatId } };

    console.log("🔒🔒🔒 Config thread_id:", chatId);
    console.log("🔒🔒🔒 Messages:", cachedMessages);
    const stream = await app.stream({ messages: cachedMessages }, config);
    // for await (const event of stream) {
    //   console.log("✅✅✅ Event:", event);
    // }
    return stream;
  } catch (error) {
    console.error("Error in submitQuestion:", error);

    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "Error: Invalid or missing Anthropic API key. Please check your configuration.";
      } else if (error.message.includes("Invalid message format")) {
        return "Error: Message format is invalid. Please try again.";
      } else if (error.message.includes("No response")) {
        return "Error: No response received from Claude. Please try again.";
      }
    }

    return "An unexpected error occurred. Please try again later.";
  }
}
