"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";
import { BotIcon, Download } from "lucide-react";
import { MediaAttachment } from "@/lib/types";
import { MediaDisplay } from "@/components/MediaDisplay";
import { parseDocumentBlocks } from "@/lib/documentParser";
import { DocumentCard } from "@/components/DocumentCard";
import { DocumentDownload } from "@/components/DocumentDownload";
import { Button } from "@/components/ui/button";

interface MessageBubbleProps {
  content: string;
  isUser?: boolean;
  attachments?: MediaAttachment[];
}

const formatMessage = (content: string): string => {
  // First unescape backslashes
  content = content.replace(/\\\\/g, "\\");

  // Then handle newlines
  content = content.replace(/\\n/g, "\n");

  // Remove only the markers but keep the content between them
  content = content.replace(/---START---\n?/g, "").replace(/\n?---END---/g, "");

  // Trim any extra whitespace that might be left
  return content.trim();
};

export function MessageBubble({ content, isUser, attachments }: MessageBubbleProps) {
  const { user } = useUser();
  
  // Parse document blocks from the content
  const parsedContent = parseDocumentBlocks(content);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} group`}>
      <div className="relative max-w-[85%] md:max-w-[75%]">
        <div
          className={`rounded-2xl px-4 py-2.5 shadow-sm ring-1 ring-inset relative ${
            isUser
              ? "bg-blue-600 text-white rounded-br-none ring-blue-700"
              : "bg-white text-gray-900 rounded-bl-none ring-gray-200"
          }`}
        >
          {attachments && attachments.length > 0 && (
            <MediaDisplay attachments={attachments} isUser={isUser} />
          )}
          
          {/* Display content with documents */}
          {parsedContent.hasDocuments ? (
            <div>
              {/* Display any text before the first document */}
              {parsedContent.contentWithPlaceholders.split('[DOCUMENT:')[0].trim() && (
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed mb-2">
                  <div dangerouslySetInnerHTML={{ 
                    __html: formatMessage(parsedContent.contentWithPlaceholders.split('[DOCUMENT:')[0].trim()) 
                  }} />
                </div>
              )}
              
              {/* Display documents */}
              {parsedContent.documents.map((doc, index) => (
                <DocumentCard key={index} document={doc} isUser={isUser} />
              ))}
              
              {/* Display any remaining text after documents */}
              {(() => {
                const parts = parsedContent.contentWithPlaceholders.split(/\[DOCUMENT:[^\]]+\]/);
                const lastPart = parts[parts.length - 1].trim();
                return lastPart ? (
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed mt-2">
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(lastPart) }} />
                  </div>
                ) : null;
              })()}
            </div>
          ) : (
            content && (
              <div className="whitespace-pre-wrap text-[15px] leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: formatMessage(content) }} />
              </div>
            )
          )}
        </div>

        {/* Avatar */}
        <div
          className={`absolute bottom-0 ${
            isUser
              ? "right-0 translate-x-1/2 translate-y-1/2"
              : "left-0 -translate-x-1/2 translate-y-1/2"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-full border-2 ${
              isUser ? "bg-white border-gray-100" : "bg-blue-600 border-white"
            } flex items-center justify-center shadow-sm`}
          >
            {isUser ? (
              <Avatar className="h-7 w-7">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback>
                  {user?.firstName?.charAt(0)}
                  {user?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <BotIcon className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
        
        {/* Download button for AI responses without documents */}
        {!isUser && content && !parsedContent.hasDocuments && (
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            <DocumentDownload 
              content={content} 
              filename="ai-response"
            />
          </div>
        )}
      </div>
    </div>
  );
}
