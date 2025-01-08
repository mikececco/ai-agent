import { ConvexReactClient } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { submitQuestion } from "@/lib/langgraph";

export async function generateAIResponse(
  client: ConvexReactClient,
  chatId: Id<"chats">,
  content: string
) {
  console.log("🤖 Generating AI response:", {
    chatId,
    contentLength: content.length,
  });

  // Get AI response using langgraph
  const aiResponse = await submitQuestion([
    {
      lc: 1,
      type: "constructor",
      id: ["HumanMessage"],
      kwargs: {
        content,
      },
    },
  ]);

  if (!aiResponse) {
    throw new Error("Failed to generate AI response");
  }

  console.log("✨ Generated AI response:", {
    chatId,
    contentLength: aiResponse.length,
  });

  // Store the AI response in Convex
  await client.mutation(api.messages.store, {
    chatId,
    content: aiResponse,
    role: "assistant",
  });

  console.log("✅ Stored AI response:", {
    chatId,
    contentLength: aiResponse.length,
  });

  return aiResponse;
}
