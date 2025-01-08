"use server";

import {
  AIMessage,
  BaseMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import { Serialized } from "@langchain/core/load/serializable";
import { MessageContentText } from "@langchain/core/messages";

const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
  }),
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
const model = new ChatAnthropic({
  modelName: "claude-3-5-sonnet-20241022",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  temperature: 0.7,
  maxTokens: 4096,
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
        const usage = output.llmOutput?.usage;
        if (usage) {
          console.log("📊 Token Usage:", {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            total_tokens: usage.input_tokens + usage.output_tokens,
            cache_creation_input_tokens: usage.cache_creation_input_tokens || 0,
            cache_read_input_tokens: usage.cache_read_input_tokens || 0,
          });
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

// Define the function that determines whether to continue or not
function shouldContinue(state: typeof StateAnnotation.State) {
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

// Define the function that calls the model with better tool instructions
async function callModel(state: typeof StateAnnotation.State) {
  // System message with cache control
  console.log("🔒 Setting cache control: System Message");
  const systemMessage = new SystemMessage({
    content: [
      {
        type: "text",
        text: `You are an AI assistant that uses tools to help answer questions. You have access to several tools that can help you find information and perform tasks.

When using tools:
- Only use the tools that are explicitly provided
- For GraphQL queries, ALWAYS provide necessary variables in the variables field as a JSON string
- For youtube_transcript tool, always include both videoUrl and langCode (default "en") in the variables
- For google_books tool, include q and maxResults in the variables
- Structure GraphQL queries to request all available fields shown in the schema
- Explain what you're doing when using tools
- Share the results of tool usage with the user
- If a tool call fails, explain the error and try again with corrected parameters
- If prompt is too long, break it down into smaller parts and use the tools to answer each part

Tool-specific instructions:
1. youtube_transcript:
   - Query: { transcript(videoUrl: $videoUrl, langCode: $langCode) { title captions { text start dur } } }
   - Variables: { "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID", "langCode": "en" }

2. google_books:
   - For search: { books(q: $q, maxResults: $maxResults) { volumeId title authors } }
   - Variables: { "q": "search terms", "maxResults": 5 }

Remember to maintain context across the conversation and refer back to previous messages when relevant.`,
        cache_control: { type: "ephemeral" },
      },
    ],
  });

  // Get conversation history and add cache control to the last message
  const conversationHistory = state.messages.map((msg, index) => {
    // Add cache control to the last message in the conversation
    if (index === state.messages.length - 1) {
      console.log("🔒 Setting cache control: Last Message in Conversation");
      const content =
        typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content) && msg.content[0]?.type === "text"
            ? msg.content[0].text
            : String(msg.content);

      if (msg instanceof AIMessage) {
        return new AIMessage({
          content: [
            {
              type: "text",
              text: content,
              cache_control: { type: "ephemeral" },
            },
          ],
        });
      }
      if (msg instanceof HumanMessage) {
        return new HumanMessage({
          content: [
            {
              type: "text",
              text: content,
              cache_control: { type: "ephemeral" },
            },
          ],
        });
      }
    }
    return msg;
  });

  const messages = [systemMessage, ...conversationHistory];

  const response = await model.invoke(messages);

  return { messages: [response] };
}

// Define a new graph
const workflow = new StateGraph(StateAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

// Initialize memory to persist state between graph runs
const checkpointer = new MemorySaver();

const app = workflow.compile({ checkpointer });

export async function submitQuestion(
  messages: Array<Serialized>
): Promise<string> {
  try {
    const config = { configurable: { thread_id: "42" } };

    // Transform messages to maintain conversation context with caching
    const formattedMessages = messages.map((msg, index) => {
      if (msg.type === "constructor") {
        if (msg.id[0] === "HumanMessage") {
          // Don't cache the current user message
          if (index === messages.length - 1) {
            console.log("⚡ Skipping cache for current user message");
            return new HumanMessage(msg.kwargs.content);
          }
          // Cache previous user messages for context
          console.log("🔒 Setting cache control: Previous User Message");
          return new HumanMessage({
            content: [
              {
                type: "text",
                text: msg.kwargs.content,
                cache_control: { type: "ephemeral" },
              },
            ],
          });
        }
        if (msg.id[0] === "AIMessage") {
          // Cache all previous assistant messages for context
          console.log("🔒 Setting cache control: Assistant Message");
          return new AIMessage({
            content: [
              {
                type: "text",
                text: msg.kwargs.content,
                cache_control: { type: "ephemeral" },
              },
            ],
          });
        }
        if (msg.id[0] === "SystemMessage") {
          console.log("🔒 Setting cache control: System Message");
          return new SystemMessage({
            content: [
              {
                type: "text",
                text: msg.kwargs.content,
                cache_control: { type: "ephemeral" },
              },
            ],
          });
        }
      }
      throw new Error("Invalid message format");
    });

    console.log("📝 Formatted Messages:", formattedMessages);
    const finalState = await app.invoke(
      {
        messages: formattedMessages,
      },
      config
    );

    const lastMessage = finalState?.messages[finalState.messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      throw new Error("No response received from Claude");
    }

    // Handle both string and structured responses
    if (typeof lastMessage.content === "string") {
      return lastMessage.content;
    }

    // Handle structured response format
    return lastMessage.content
      .filter(
        (content): content is MessageContentText =>
          content.type === "text" && "text" in content
      )
      .map((content) => content.text)
      .join("\n");
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
