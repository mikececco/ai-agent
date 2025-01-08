import ChatInterface from "@/components/ChatInterface";
import { Id } from "@/convex/_generated/dataModel";

interface ChatPageProps {
  params: {
    chatId: Id<"chats">;
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { chatId } = await params;

  return (
    <div className="flex-1 overflow-hidden">
      <ChatInterface chatId={chatId} />
    </div>
  );
}
