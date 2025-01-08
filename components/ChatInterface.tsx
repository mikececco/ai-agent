"use client";

import { useEffect, useRef, useState } from "react";
import { useConvex, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { ViewHorizontalIcon } from "@radix-ui/react-icons";
import { generateAIResponse } from "@/app/actions";

export default function ChatInterface({ chatId }: { chatId: Id<"chats"> }) {
  const convex = useConvex();
  const messages = useQuery(api.messages.list, { chatId });
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setInput("");

    try {
      // Send user message first
      await convex.mutation(api.messages.send, {
        chatId,
        content: trimmedInput,
      });

      // Then show loading and generate AI response
      setIsLoading(true);
      await generateAIResponse(convex, chatId, trimmedInput);
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
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
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
