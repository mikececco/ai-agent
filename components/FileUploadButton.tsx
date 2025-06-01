"use client";

import { useState, useRef } from "react";
import { Paperclip, X, FileIcon, ImageIcon, VideoIcon, AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaAttachment } from "@/lib/types";
import JSZip from "jszip";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";

interface FileUploadButtonProps {
  onFilesSelected: (attachments: MediaAttachment[]) => void;
  attachments: MediaAttachment[];
  disabled?: boolean;
}

const MAX_ZIP_SIZE = 100 * 1024 * 1024; // 100MB for ZIP files
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm"];
const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf", 
  "text/plain", 
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip", 
  "application/x-zip-compressed", 
  "application/x-zip",
  "application/octet-stream", // Some systems report ZIP as this
  "multipart/x-zip"
];

export function FileUploadButton({ onFilesSelected, attachments, disabled }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const getFileType = (mimeType: string, fileName: string): MediaAttachment["type"] => {
    // Check by extension for ZIP files as MIME types can be unreliable
    if (fileName.toLowerCase().endsWith('.zip')) {
      return "document";
    }
    // Check by extension for common image types
    const ext = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return "image";
    }
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return "image";
    if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return "video";
    if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return "audio";
    return "document";
  };

  const getMimeType = (fileName: string): string => {
    const ext = fileName.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
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

  const uploadToConvexStorage = async (file: Blob, fileName: string, mimeType: string): Promise<{ storageId: string; url: string }> => {
    const convex = getConvexClient();
    
    // Generate upload URL
    const uploadUrl = await convex.mutation(api.files.generateUploadUrl);
    
    // Upload file to Convex storage
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: file,
    });
    
    if (!response.ok) {
      throw new Error("Failed to upload file");
    }
    
    const { storageId } = await response.json();
    
    // Get the file URL
    const fileInfo = await convex.mutation(api.files.saveFile, {
      storageId,
      name: fileName,
      mimeType,
      size: file.size,
    });
    
    return { storageId, url: fileInfo.url };
  };

  const processZipFile = async (file: File): Promise<MediaAttachment[]> => {
    console.log(`Extracting ZIP file: ${file.name}`);
    const extractedAttachments: MediaAttachment[] = [];
    
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      
      // Get all files sorted by name
      const fileEntries = Object.entries(contents.files)
        .filter(([_, zipEntry]) => !(zipEntry as any).dir)
        .sort(([a], [b]) => a.localeCompare(b));
      
      console.log(`Found ${fileEntries.length} files in ZIP`);
      setUploadProgress(`Processing ${fileEntries.length} files from ZIP...`);
      
      let processedCount = 0;
      for (const [path, zipEntry] of fileEntries) {
        try {
          setUploadProgress(`Uploading ${processedCount + 1}/${fileEntries.length}: ${path}`);
          
          // Get file data as blob
          const blob = await (zipEntry as any).async('blob');
          const mimeType = getMimeType(path);
          const fileType = getFileType(mimeType, path);
          
          // Upload to Convex storage
          const { storageId, url } = await uploadToConvexStorage(blob, path, mimeType);
          
          extractedAttachments.push({
            type: fileType,
            mimeType,
            storageId,
            url,
            name: path,
            size: blob.size,
          });
          
          processedCount++;
          console.log(`Successfully uploaded ${path} (${fileType}, ${(blob.size / 1024).toFixed(1)}KB)`);
        } catch (error) {
          console.error(`Failed to process ${path} from ZIP:`, error);
        }
      }
      
      console.log(`Extracted and uploaded ${extractedAttachments.length} files from ZIP`);
      setUploadProgress("");
      return extractedAttachments;
    } catch (error) {
      console.error('Failed to extract ZIP file:', error);
      setUploadProgress("");
      throw error;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const newAttachments: MediaAttachment[] = [];

      for (const file of files) {
        console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${(file.size / 1024).toFixed(1)}KB`);
        
        // Check if it's a ZIP file by extension
        const isZipFile = file.name.toLowerCase().endsWith('.zip');
        
        if (isZipFile) {
          // Validate ZIP file size
          if (file.size > MAX_ZIP_SIZE) {
            alert(`ZIP file ${file.name} is too large. Maximum ZIP size is 100MB.`);
            continue;
          }
          
          try {
            // Extract and upload files from ZIP
            const extractedFiles = await processZipFile(file);
            newAttachments.push(...extractedFiles);
            
            alert(`Successfully uploaded ${extractedFiles.length} files from ${file.name}`);
          } catch (error) {
            alert(`Failed to extract ZIP file ${file.name}. Please try again.`);
            console.error('ZIP extraction error:', error);
          }
        } else {
          // Regular file processing
          const fileType = getFileType(file.type, file.name);
          const allowedTypes = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, 
            ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES];
          
          if (!allowedTypes.includes(file.type) && !isZipFile) {
            alert(`File type ${file.type} for ${file.name} is not supported.`);
            continue;
          }

          try {
            setUploadProgress(`Uploading ${file.name}...`);
            
            // Upload to Convex storage
            const { storageId, url } = await uploadToConvexStorage(file, file.name, file.type);
            
            newAttachments.push({
              type: fileType,
              mimeType: file.type,
              storageId,
              url,
              name: file.name,
              size: file.size,
            });
            
            console.log(`Successfully uploaded ${file.name}`);
            setUploadProgress("");
          } catch (fileError) {
            console.error(`Failed to process ${file.name}:`, fileError);
            alert(`Failed to upload ${file.name}. Please try again.`);
            setUploadProgress("");
          }
        }
      }

      if (newAttachments.length > 0) {
        console.log(`Successfully processed ${newAttachments.length} files`);
        onFilesSelected([...attachments, ...newAttachments]);
      }
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Failed to process files. Please try again.");
    } finally {
      setIsProcessing(false);
      setUploadProgress("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (index: number) => {
    const newAttachments = attachments.filter((_, i) => i !== index);
    onFilesSelected(newAttachments);
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
          ...ALLOWED_AUDIO_TYPES, ...ALLOWED_DOCUMENT_TYPES, '.zip'].join(",")}
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

      {/* Upload progress */}
      {uploadProgress && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg shadow-sm z-20 min-w-[300px]">
          <div className="text-sm text-blue-700">{uploadProgress}</div>
        </div>
      )}

      {/* File previews */}
      {attachments.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border rounded-lg shadow-sm z-10 min-w-[300px] max-h-[300px] overflow-y-auto">
          <div className="mb-2 p-2 bg-gray-50 rounded">
            <div className="text-sm text-gray-700 font-medium">
              {attachments.length} file{attachments.length > 1 ? 's' : ''} attached
            </div>
          </div>
          
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                {getFileIcon(attachment.type)}
                <span className="flex-1 text-sm truncate" title={attachment.name}>
                  {attachment.name}
                </span>
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