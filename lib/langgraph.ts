"use server";

import {
  AIMessage,
  BaseMessage,
  SystemMessage,
  HumanMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { StateGraph } from "@langchain/langgraph";
import { MemorySaver, Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import wxflows from "@wxflows/sdk/langchain";
import { Serialized } from "@langchain/core/load/serializable";

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

// Connect to the LLM provider
const model = new ChatOpenAI({
  modelName: "gpt-4o",
  openAIApiKey: process.env.OPENAI_API_KEY,
  temperature: 0.7,
  maxTokens: 4096,
}).bindTools(tools);

// Define the function that determines whether to continue or not
function shouldContinue(state: typeof StateAnnotation.State) {
  const messages = state.messages;
  const lastMessage = messages[messages.length - 1] as AIMessage;

  // If the LLM makes a tool call, then we route to the "tools" node
  if (lastMessage.tool_calls?.length) {
    console.log("TOOL_CALL", JSON.stringify(lastMessage.tool_calls));
    return "tools";
  }
  // Otherwise, we stop (reply to the user)
  return "__end__";
}

// Define the function that calls the model
async function callModel(state: typeof StateAnnotation.State) {
  const systemMessage = new SystemMessage(
    `You are an advanced AI assistant powered by GPT-4. Your responses should be:
    1. Helpful and informative
    2. Truthful - if you're not sure about something, say so
    3. Focused on using the available tools rather than your pre-trained knowledge
    4. Clear and well-structured
    5. Professional but conversational in tone

    When using tools:
    - Only use the tools that are explicitly provided
    - Explain what you're doing when using tools
    - Share the results of tool usage with the user

    Remember to maintain context across the conversation and refer back to previous messages when relevant.`
  );

  const messages = [systemMessage, ...state.messages];
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
    const finalState = await app.invoke(
      {
        messages: messages.map((msg) => {
          if (msg.type === "constructor" && msg.id[0] === "HumanMessage") {
            return new HumanMessage(msg.kwargs.content as string);
          }
          throw new Error("Invalid message format");
        }),
      },
      config
    );

    const lastMessage = finalState?.messages[finalState.messages.length - 1];
    if (!lastMessage || !lastMessage.content) {
      throw new Error("No response received from GPT-4");
    }

    return typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);
  } catch (error) {
    console.error("Error in submitQuestion:", error);

    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes("API key")) {
        return "Error: Invalid or missing OpenAI API key. Please check your configuration.";
      } else if (error.message.includes("Invalid message format")) {
        return "Error: Message format is invalid. Please try again.";
      } else if (error.message.includes("No response")) {
        return "Error: No response received from GPT-4. Please try again.";
      }
    }

    return "An unexpected error occurred. Please try again later.";
  }
}
