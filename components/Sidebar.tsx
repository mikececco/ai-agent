"use client";

import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import TimeAgo from "react-timeago";
import { Doc, Id } from "@/convex/_generated/dataModel";

function ChatRow({
  chat,
  onDelete,
}: {
  chat: Doc<"chats">;
  onDelete: (id: Id<"chats">) => void;
}) {
  const router = useRouter();
  const lastMessage = useQuery(api.messages.getLastMessage, {
    chatId: chat._id,
  });

  return (
    <div
      className="group rounded-lg border bg-white shadow-sm hover:shadow transition-all cursor-pointer"
      onClick={() => router.push(`/dashboard/chat/${chat._id}`)}
    >
      <div className="p-4">
        <div className="flex justify-between items-start">
          <p className="text-sm text-gray-500 truncate flex-1">
            {lastMessage ? (
              <>
                {lastMessage.role === "user" ? "You: " : "AI: "}
                {lastMessage.content}
              </>
            ) : (
              <span className="text-gray-400">New conversation</span>
            )}
          </p>
          <Button
            variant="ghost"
            size="icon"
            className="opacity-0 group-hover:opacity-100 -mr-2 -mt-2 ml-2"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(chat._id);
            }}
          >
            <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-500" />
          </Button>
        </div>
        {lastMessage && (
          <p className="text-xs text-gray-400 mt-1">
            <TimeAgo date={lastMessage.createdAt} />
          </p>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const chats = useQuery(api.chats.listChats);
  const createChat = useMutation(api.chats.createChat);
  const deleteChat = useMutation(api.chats.deleteChat);

  const handleNewChat = async () => {
    const chatId = await createChat({ title: "New Chat" });
    router.push(`/dashboard/chat/${chatId}`);
  };

  const handleDeleteChat = (id: Id<"chats">) => {
    deleteChat({ id });
  };

  return (
    <div className="w-64 bg-gray-50 border-r h-full flex flex-col">
      <div className="p-4">
        <Button
          onClick={handleNewChat}
          className="w-full bg-blue-500 hover:bg-blue-600"
        >
          <PlusIcon className="mr-2 h-5 w-5" />
          Start a new conversation
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {chats?.map((chat) => (
          <ChatRow key={chat._id} chat={chat} onDelete={handleDeleteChat} />
        ))}
      </div>
    </div>
  );
}
