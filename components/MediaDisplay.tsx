"use client";

import { MediaAttachment } from "@/lib/types";
import { FileIcon, ImageIcon, VideoIcon, AudioLines, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MediaDisplayProps {
  attachments: MediaAttachment[];
  isUser?: boolean;
}

export function MediaDisplay({ attachments, isUser = false }: MediaDisplayProps) {
  if (!attachments || attachments.length === 0) return null;

  const handleDownload = (attachment: MediaAttachment) => {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name || 'download';
    link.click();
  };

  const getIcon = (type: MediaAttachment["type"]) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "video":
        return <VideoIcon className="w-5 h-5" />;
      case "audio":
        return <AudioLines className="w-5 h-5" />;
      default:
        return <FileIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className={`mt-2 space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
      {attachments.map((attachment, index) => (
        <div key={index} className="max-w-xs">
          {attachment.type === "image" ? (
            <div className="relative group">
              <img
                src={attachment.data}
                alt={attachment.name || "Image"}
                className="rounded-lg max-h-64 object-contain cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(attachment.data, '_blank')}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition bg-black/50 hover:bg-black/70 text-white"
                onClick={() => handleDownload(attachment)}
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          ) : attachment.type === "video" ? (
            <video
              src={attachment.data}
              controls
              className="rounded-lg max-h-64"
            >
              Your browser does not support the video tag.
            </video>
          ) : attachment.type === "audio" ? (
            <audio
              src={attachment.data}
              controls
              className="max-w-full"
            >
              Your browser does not support the audio element.
            </audio>
          ) : (
            <div 
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-80 transition ${
                isUser ? 'bg-blue-100' : 'bg-gray-100'
              }`}
              onClick={() => handleDownload(attachment)}
            >
              {getIcon(attachment.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {attachment.name || 'Unnamed file'}
                </p>
                {attachment.size && (
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                )}
              </div>
              <Download className="w-4 h-4 text-gray-500" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
} 