"use client";

import { FileText, FileCode, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParsedDocument } from "@/lib/documentParser";
import { DocumentDownload } from "./DocumentDownload";

interface DocumentCardProps {
  document: ParsedDocument;
  isUser?: boolean;
}

export function DocumentCard({ document, isUser = false }: DocumentCardProps) {
  const getIcon = () => {
    const ext = document.extension.toLowerCase();
    if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml'].includes(ext)) {
      return <FileCode className="w-5 h-5" />;
    }
    return <FileText className="w-5 h-5" />;
  };

  const getLanguage = () => {
    const ext = document.extension.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      md: 'markdown',
      json: 'json',
      html: 'html',
      css: 'css',
      xml: 'xml',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      sh: 'bash',
      yaml: 'yaml',
      yml: 'yaml',
    };
    return languageMap[ext] || 'text';
  };

  const truncateContent = (content: string, maxLines: number = 10) => {
    const lines = content.split('\n');
    if (lines.length <= maxLines) return content;
    return lines.slice(0, maxLines).join('\n') + '\n...';
  };

  return (
    <div className={`my-3 rounded-lg border ${
      isUser ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
    } overflow-hidden`}>
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-medium text-sm">{document.filename}</span>
        </div>
        <DocumentDownload 
          content={document.content} 
          filename={document.filename.replace(`.${document.extension}`, '')}
        />
      </div>
      
      <div className="p-3">
        <pre className="text-xs overflow-x-auto">
          <code className={`language-${getLanguage()}`}>
            {truncateContent(document.content)}
          </code>
        </pre>
      </div>
    </div>
  );
} 