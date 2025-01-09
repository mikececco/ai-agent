import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { submitQuestion } from "@/lib/langgraph";

export async function generateAIResponse(
  client: ConvexReactClient,
  chatId: Id<"chats">,
  content: string,
  onStream: (chunk: string) => void
) {
  console.log("🤖 Generating AI response:", {
    chatId,
    contentLength: content.length,
  });

  try {
    let fullResponse = "";

    // Get AI response using langgraph with streaming
    const response = await submitQuestion(
      [
        {
          lc: 1,
          type: "constructor",
          id: ["HumanMessage"],
          kwargs: {
            content,
          },
        },
      ],
      true,
      (token) => {
        // Accumulate tokens and stream the full response so far
        fullResponse += token;
        onStream(fullResponse);
      }
    );

    // If we got a string response instead of streaming, use it
    if (typeof response === "string") {
      fullResponse = response;
      onStream(fullResponse);
    }

    // Store the complete response in Convex
    await client.mutation(api.messages.store, {
      chatId,
      content: fullResponse,
      role: "assistant",
    });

    console.log("✅ Stored AI response:", {
      chatId,
      contentLength: fullResponse.length,
    });

    return fullResponse;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw error;
  }
}
