"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { MouseEvent } from "react";

export default function Sidebar() {
  const router = useRouter();
  const chats = useQuery(api.chats.listChats);
  const createChat = useMutation(api.chats.createChat);
  const deleteChat = useMutation(api.chats.deleteChat);

  const handleCreateChat = async () => {
    const chatId = await createChat({ title: "New Chat" });
    router.push(`/dashboard/chat/${chatId}`);
  };

  const handleDeleteChat = async (chatId: Id<"chats">) => {
    await deleteChat({ id: chatId });
  };

  return (
    <div className="w-64 h-screen bg-gray-50 border-r flex flex-col">
      <div className="p-4">
        <Button
          onClick={handleCreateChat}
          className="w-full flex items-center justify-center gap-2"
        >
          <PlusIcon />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats?.map((chat: Doc<"chats">) => (
          <div
            key={chat._id}
            className="group flex items-center gap-2 px-4 py-2 hover:bg-gray-100 cursor-pointer"
            onClick={() => router.push(`/dashboard/chat/${chat._id}`)}
          >
            <span className="flex-1 truncate">{chat.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                handleDeleteChat(chat._id);
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
