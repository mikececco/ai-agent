"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ViewHorizontalIcon } from "@radix-ui/react-icons";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import { SSEParser } from "@/lib/utils";

export default function ChatInterface({ chatId }: { chatId: Id<"chats"> }) {
  const messages = useQuery(api.messages.list, { chatId });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  // Clear streamed response when a new message appears
  useEffect(() => {
    if (messages?.length) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant") {
        setStreamedResponse("");
      }
    }
  }, [messages]);

  const formatTerminalOutput = (text: string) => {
    const regex = /---START---([\s\S]*?)---END---/g;
    const terminalTemplate = (content: string) => `
      <div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]">
        <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
          <span class="text-red-500">●</span>
          <span class="text-yellow-500">●</span>
          <span class="text-green-500">●</span>
          <span class="text-gray-400 ml-1 text-sm">~/Executing...</span>
        </div>
        <div class="text-gray-400 mt-1">$ query</div>
        <pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${content.trim()}</pre>
      </div>
    `;

    // If no command block markers are present, return as is
    if (!text.includes("---START---")) return text;

    // Handle complete command blocks
    if (text.includes("---END---")) {
      return text.replace(regex, (_, content) => terminalTemplate(content));
    }

    // Handle streaming command block
    const [beforeStart, content] = text.split("---START---");
    return beforeStart + terminalTemplate(content);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput("");
    setStreamedResponse("");
    setIsLoading(true);

    try {
      const requestBody: ChatRequestBody = {
        messages:
          messages?.map((msg) => ({
            role: msg.role,
            content: msg.content.replace(/\\n/g, "\n"),
          })) || [],
        newMessage: trimmedInput,
        chatId,
      };

      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const parser = new SSEParser();

      if (!reader) throw new Error("No reader available");

      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk and parse SSE messages
          const chunk = decoder.decode(value);
          const messages = parser.parse(chunk);

          // Process each parsed message
          for (const message of messages) {
            if (
              message.type === StreamMessageType.Token &&
              "token" in message
            ) {
              fullResponse += message.token;
              setStreamedResponse(fullResponse);
            } else if (
              message.type === StreamMessageType.Error &&
              "error" in message
            ) {
              console.error("Stream error:", message.error);
              throw new Error(message.error);
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-4xl mx-auto w-full">
        {messages?.map((message: Doc<"messages">) => (
          <div
            key={message._id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`rounded-2xl px-4 py-2 max-w-[85%] md:max-w-[75%] shadow-sm ${
                message.role === "user"
                  ? "bg-blue-500 text-white rounded-br-none"
                  : "bg-gray-100 text-black rounded-bl-none"
              }`}
            >
              <div className="whitespace-pre-wrap text-[15px]">
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      message.role === "assistant"
                        ? formatTerminalOutput(
                            message.content.replace(/\\n/g, "\n")
                          )
                        : message.content.replace(/\\n/g, "\n"),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {streamedResponse && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 max-w-[85%] md:max-w-[75%] bg-gray-100 text-black rounded-bl-none shadow-sm">
              <div className="whitespace-pre-wrap text-[15px]">
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatTerminalOutput(
                      streamedResponse.replace(/\\n/g, "\n")
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {isLoading && !streamedResponse && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-4 py-2 bg-gray-100 text-black rounded-bl-none shadow-sm">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pl-4 pr-4"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-full h-10 w-10 p-0 flex items-center justify-center"
            >
              <ViewHorizontalIcon className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
