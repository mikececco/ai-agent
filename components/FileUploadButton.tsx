"use client";

import { useState, useRef } from "react";
import { Paperclip, X, FileIcon, ImageIcon, VideoIcon, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaAttachment } from "@/lib/types";

interface FileUploadButtonProps {
  onFilesSelected: (attachments: MediaAttachment[]) => void;
  attachments: MediaAttachment[];
  disabled?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "text/plain", "application/msword", 
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export function FileUploadButton({ onFilesSelected, attachments, disabled }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const getFileType = (mimeType: string): MediaAttachment["type"] => {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
    if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return "audio";
    return "document";
  };

  const getFileIcon = (type: MediaAttachment["type"]) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-4 h-4" />;
      case "video":
        return <VideoIcon className="w-4 h-4" />;
      case "audio":
        return <AudioLines className="w-4 h-4" />;
      default:
        return <FileIcon className="w-4 h-4" />;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const newAttachments: MediaAttachment[] = [];

      for (const file of files) {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          alert(`File ${file.name} is too large. Maximum size is 10MB.`);
          continue;
        }

        // Validate file type
        const fileType = getFileType(file.type);
        const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, 
          ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
        
        if (!allowedTypes.includes(file.type)) {
          alert(`File type ${file.type} is not supported.`);
          continue;
        }

        // Convert file to base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          type: fileType,
          mimeType: file.type,
          data: base64,
          name: file.name,
          size: file.size,
        });
      }

      if (newAttachments.length > 0) {
        onFilesSelected([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Failed to process files. Please try again.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    onFilesSelected(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={[...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, 
          ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES].join(",")}
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isProcessing}
        className="text-gray-500 hover:text-gray-700"
      >
        <Paperclip className="w-5 h-5" />
      </Button>

      {/* File previews */}
      {attachments.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border rounded-lg shadow-sm z-10 min-w-[300px]">
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                {getFileIcon(attachment.type)}
                <span className="flex-1 text-sm truncate">{attachment.name}</span>
                {attachment.size && (
                  <span className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(index)}
                  className="h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 