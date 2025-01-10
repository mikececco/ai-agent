"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ViewHorizontalIcon } from "@radix-ui/react-icons";

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

  const formatCommandOutput = (text: string) => {
    const regex = /---START---([\s\S]*?)---END---/g;
    return text.replace(regex, (match, content) => {
      return `<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal">
          <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
            <span class="text-red-500">●</span>
            <span class="text-yellow-500">●</span>
            <span class="text-green-500">●</span>
            <span class="text-gray-400 ml-1 text-sm">~/Executing...</span>
          </div>
          <div class="text-gray-400 mt-1">$ query</div>
          <pre class="text-green-400 mt-0.5">${content.trim()}</pre>
        </div>`;
    });
  };

  const formatStreamingCommandOutput = (text: string, isStreaming: boolean) => {
    if (!isStreaming) {
      return formatCommandOutput(text);
    }

    // If we have a complete command block
    if (text.includes("---START---") && text.includes("---END---")) {
      const beforeStart = text.split("---START---")[0];
      const middle = text.split("---START---")[1].split("---END---")[0];
      const afterEnd = text.split("---END---")[1];

      return `${beforeStart}<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal">
        <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
          <span class="text-red-500">●</span>
          <span class="text-yellow-500">●</span>
          <span class="text-green-500">●</span>
          <span class="text-gray-400 ml-1 text-sm">~/Executing...</span>
        </div>
        <div class="text-gray-400 mt-1">$ query</div>
        <pre class="text-green-400 mt-0.5">${middle.trim()}</pre>
      </div>${afterEnd}`;
    }

    // If we're starting a command block
    if (text.includes("---START---")) {
      const [beforeStart, content] = text.split("---START---");
      return `${beforeStart}<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal">
        <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
          <span class="text-red-500">●</span>
          <span class="text-yellow-500">●</span>
          <span class="text-green-500">●</span>
          <span class="text-gray-400 ml-1 text-sm">~/Executing...</span>
        </div>
        <div class="text-gray-400 mt-1">$ query</div>
        <pre class="text-green-400 mt-0.5">${content}</pre>
      </div>`;
    }

    // If we're in the middle of a command block, just return the text as is
    return text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput("");
    setStreamedResponse("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages:
            messages?.map((msg) => ({
              role: msg.role,
              content: msg.content.replace(/\\n/g, "\n"),
            })) || [],
          newMessage: trimmedInput,
          chatId,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No reader available");

      let fullResponse = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the stream chunk and split into lines
          const chunk = decoder.decode(value);
          console.log("Received chunk:", chunk);
          // Split by double newlines to handle SSE format
          const lines = chunk.split("\n\n");

          // Process each SSE message
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const data = trimmedLine.slice(6);
              console.log("Processing SSE data:", data);
              if (data === "[DONE]") continue;

              try {
                const parsedData = JSON.parse(data);
                console.log("Parsed SSE data:", parsedData);
                if (parsedData.type === "token" && parsedData.token) {
                  fullResponse += parsedData.token;
                  console.log("Updated response:", fullResponse);
                  setStreamedResponse(fullResponse);
                } else if (parsedData.type === "error" && parsedData.error) {
                  console.error("Stream error:", parsedData.error);
                  throw new Error(parsedData.error);
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.map((message: Doc<"messages">) => (
          <div
            key={message._id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-black"
              }`}
            >
              <div className="whitespace-pre-wrap">
                <div
                  dangerouslySetInnerHTML={{
                    __html:
                      message.role === "assistant"
                        ? formatStreamingCommandOutput(
                            message.content.replace(/\\n/g, "\n"),
                            false
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
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-200 text-black">
              <div className="whitespace-pre-wrap">
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatStreamingCommandOutput(
                      streamedResponse.replace(/\\n/g, "\n"),
                      true
                    ),
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {isLoading && !streamedResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 bg-gray-200 text-black">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-black animate-bounce [animation-delay:-0.3s]" />
                <div className="h-2 w-2 rounded-full bg-black animate-bounce [animation-delay:-0.15s]" />
                <div className="h-2 w-2 rounded-full bg-black animate-bounce" />
                <span className="ml-2">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <ViewHorizontalIcon className="h-5 w-5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
