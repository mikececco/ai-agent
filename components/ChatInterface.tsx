"use client";

import { useEffect, useRef, useState } from "react";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ChatRequestBody, StreamMessageType } from "@/lib/types";
import WelcomeMessage from "@/components/WelcomeMessage";
import { createSSEParser } from "@/lib/SSEParser";

interface ChatInterfaceProps {
  chatId: Id<"chats">;
  initialMessages: Doc<"messages">[];
}

const formatMessage = (content: string): string => {
  // First replace newlines
  content = content.replace(/\\n/g, "\n");

  // Remove only the markers but keep the content between them
  content = content.replace(/---START---\n?/g, "").replace(/\n?---END---/g, "");

  // Trim any extra whitespace that might be left
  return content.trim();
};

export default function ChatInterface({
  chatId,
  initialMessages,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Doc<"messages">[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [currentTool, setCurrentTool] = useState<{
    name: string;
    input: unknown;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamedResponse]);

  const formatToolOutput = (output: unknown): string => {
    if (typeof output === "string") return output;
    return JSON.stringify(output, null, 2);
  };

  const formatTerminalOutput = (
    tool: string,
    input: unknown,
    output: unknown
  ) => {
    return `<div class="bg-[#1e1e1e] text-white font-mono p-2 rounded-md my-2 overflow-x-auto whitespace-normal max-w-[600px]">
      <div class="flex items-center gap-1.5 border-b border-gray-700 pb-1">
        <span class="text-red-500">●</span>
        <span class="text-yellow-500">●</span>
        <span class="text-green-500">●</span>
        <span class="text-gray-400 ml-1 text-sm">~/${tool}</span>
      </div>
      <div class="text-gray-400 mt-1">$ Input</div>
      <pre class="text-yellow-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(input)}</pre>
      <div class="text-gray-400 mt-2">$ Output</div>
      <pre class="text-green-400 mt-0.5 whitespace-pre-wrap overflow-x-auto">${formatToolOutput(output)}</pre>
    </div>`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // Clear input and start loading
    setInput("");
    setStreamedResponse("");
    setCurrentTool(null);
    setIsLoading(true);

    // Add optimistic user message
    const optimisticUserMessage: Doc<"messages"> = {
      _id: `temp_${Date.now()}`,
      chatId,
      content: trimmedInput,
      role: "user",
      createdAt: Date.now(),
    } as Doc<"messages">;

    setMessages((prev) => [...prev, optimisticUserMessage]);

    let fullResponse = "";

    try {
      const requestBody: ChatRequestBody = {
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
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
        throw new Error(await response.text());
      }

      if (!response.body) {
        throw new Error("No response body available");
      }

      const parser = createSSEParser();
      const reader = response.body.getReader();

      try {
        // Use async iterator pattern for cleaner streaming
        for await (const chunk of readChunks(reader)) {
          const messages = parser.parse(chunk);

          for (const message of messages) {
            switch (message.type) {
              case StreamMessageType.Token:
                if ("token" in message) {
                  fullResponse += message.token;
                  setStreamedResponse(fullResponse);
                }
                break;

              case StreamMessageType.ToolStart:
                if ("tool" in message) {
                  setCurrentTool({
                    name: message.tool,
                    input: message.input,
                  });
                  fullResponse += formatTerminalOutput(
                    message.tool,
                    message.input,
                    "Processing..."
                  );
                  setStreamedResponse(fullResponse);
                }
                break;

              case StreamMessageType.ToolEnd:
                if ("tool" in message && currentTool) {
                  const lastTerminalIndex = fullResponse.lastIndexOf(
                    '<div class="bg-[#1e1e1e]'
                  );
                  if (lastTerminalIndex !== -1) {
                    fullResponse =
                      fullResponse.substring(0, lastTerminalIndex) +
                      formatTerminalOutput(
                        message.tool,
                        currentTool.input,
                        message.output
                      );
                    setStreamedResponse(fullResponse);
                  }
                  setCurrentTool(null);
                }
                break;

              case StreamMessageType.Error:
                if ("error" in message) {
                  throw new Error(message.error);
                }
                break;

              case StreamMessageType.Done:
                const assistantMessage: Doc<"messages"> = {
                  _id: `temp_assistant_${Date.now()}`,
                  chatId,
                  content: fullResponse,
                  role: "assistant",
                  createdAt: Date.now(),
                } as Doc<"messages">;
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamedResponse("");
                return; // Exit the loop
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) =>
        prev.filter((msg) => msg._id !== optimisticUserMessage._id)
      );
      setStreamedResponse(
        formatTerminalOutput(
          "error",
          "Failed to process message",
          error instanceof Error ? error.message : "Unknown error"
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to create an async iterator for the ReadableStream
  async function* readChunks(reader: ReadableStreamDefaultReader<Uint8Array>) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield new TextDecoder().decode(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-w-4xl mx-auto w-full">
        {messages?.length === 0 && <WelcomeMessage />}

        {messages?.map((message: Doc<"messages">) => (
          <div
            key={message._id}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            } animate-in slide-in-from-bottom-2`}
          >
            <div
              className={`rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[75%] shadow-sm ring-1 ring-inset ${
                message.role === "user"
                  ? "bg-blue-600 text-white rounded-br-none ring-blue-700"
                  : "bg-white text-gray-900 rounded-bl-none ring-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(message.content),
                  }}
                />
              </div>
            </div>
          </div>
        ))}
        {streamedResponse && (
          <div className="flex justify-start animate-in slide-in-from-bottom-2">
            <div className="rounded-2xl px-4 py-2.5 max-w-[85%] md:max-w-[75%] bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                <div
                  dangerouslySetInnerHTML={{
                    __html: formatMessage(streamedResponse),
                  }}
                />
              </div>
            </div>
          </div>
        )}
        {isLoading && !streamedResponse && (
          <div className="flex justify-start animate-in fade-in-0">
            <div className="rounded-2xl px-4 py-3 bg-white text-gray-900 rounded-bl-none shadow-sm ring-1 ring-inset ring-gray-200">
              <div className="flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.3s]" />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:-0.15s]" />
                <div className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-white p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="flex-1 py-3 px-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 bg-gray-50 placeholder:text-gray-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`absolute right-1.5 rounded-xl h-9 w-9 p-0 flex items-center justify-center transition-all ${
                input.trim()
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className={`transition-transform duration-200 ${
                  input.trim() ? "translate-x-0.5" : ""
                }`}
              >
                <path
                  d="M1.5 8H14.5M14.5 8L8.5 2M14.5 8L8.5 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
