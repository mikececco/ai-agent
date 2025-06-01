"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";
import { BotIcon, Download, FileIcon } from "lucide-react";
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

export function MessageBubble({ content, isUser = false, attachments }: MessageBubbleProps) {
  const { user } = useUser();
  
  const downloadFile = (url: string, filename: string, mimeType: string) => {
    // For base64 data URLs
    if (url.startsWith('data:')) {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // For regular URLs, open in new tab or trigger download
      window.open(url, '_blank');
    }
  };

  // Parse document blocks from the content
  const parsedContent = parseDocumentBlocks(content);

  // Separate images and other files
  const images: MediaAttachment[] = [];
  const otherFiles: MediaAttachment[] = [];
  attachments?.forEach((attachment) => {
    if (attachment.mimeType && attachment.mimeType.startsWith('image/')) {
      images.push(attachment);
    } else {
      otherFiles.push(attachment);
    }
  });

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

          {/* Display Images */}
          {images.length > 0 && (
            <div className={`grid gap-2 mt-2 ${
              images.length === 1 ? 'grid-cols-1' : 
              images.length === 2 ? 'grid-cols-2' : 
              'grid-cols-3'
            }`}>
              {images.map((img, idx) => (
                <div key={idx} className="relative group">
                  <img 
                    src={img.url || img.data || ''} 
                    alt={img.name || `Image ${idx + 1}`}
                    className="rounded-lg w-full h-auto cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => window.open(img.url || img.data, '_blank')}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFile(img.url || img.data || '', img.name || `image-${idx + 1}.jpg`, img.mimeType);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Download image"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Display Other Files */}
          {otherFiles.length > 0 && (
            <div className="space-y-2 mt-2">
              {otherFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileIcon className="w-5 h-5 text-gray-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name || `File ${idx + 1}`}
                    </p>
                    {file.size && (
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => downloadFile(file.url || file.data || '', file.name || `file-${idx + 1}`, file.mimeType)}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
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
