import { submitQuestion } from "@/lib/langgraph";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "edge";

function sendSSEMessage(writer: WritableStreamDefaultWriter<any>, data: any) {
  const encoder = new TextEncoder();
  return writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { messages, chatId } = await req.json();
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

    // Create stream with larger queue strategy for better performance
    const stream = new TransformStream({}, { highWaterMark: 1024 });
    const writer = stream.writable.getWriter();

    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });

    // Handle the streaming response
    (async () => {
      try {
        // Send initial connection established message
        await sendSSEMessage(writer, { type: "connected" });

        // Send user message to Convex
        await convex.mutation(api.messages.send, {
          chatId,
          content: messages[messages.length - 1].kwargs.content,
        });

        let fullResponse = "";

        // Stream AI response
        await submitQuestion(messages, true, async (token) => {
          fullResponse += token;
          await sendSSEMessage(writer, {
            type: "token",
            token,
          });
        });

        // Store complete response
        await convex.mutation(api.messages.store, {
          chatId,
          content: fullResponse,
          role: "assistant",
        });

        // Send completion message
        await sendSSEMessage(writer, { type: "done" });
      } catch (error) {
        console.error("Error in stream:", error);
        await sendSSEMessage(writer, {
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        try {
          await writer.close();
        } catch (closeError) {
          console.error("Error closing writer:", closeError);
        }
      }
    })();

    return response;
  } catch (error) {
    console.error("Error in chat API:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
