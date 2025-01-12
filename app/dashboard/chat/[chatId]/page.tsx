import ChatInterface from "@/components/ChatInterface";
import { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convex";

interface ChatPageProps {
  params: {
    chatId: Id<"chats">;
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  // Get Convex client and fetch messages
  const convex = getConvexClient();
  const initialMessages = await convex.query(api.messages.list, { chatId });

  return (
    <div className="flex-1 overflow-hidden">
      <ChatInterface chatId={chatId} initialMessages={initialMessages} />
    </div>
  );
}
