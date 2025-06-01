"use client";

import { Download, FileText, FileCode, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/custom-dropdown";

interface DocumentDownloadProps {
  content: string;
  filename?: string;
  format?: "txt" | "md" | "html" | "json";
}

export function DocumentDownload({ 
  content, 
  filename = "document", 
  format = "txt" 
}: DocumentDownloadProps) {
  
  const cleanContent = (text: string): string => {
    // Remove terminal-style formatting
    const withoutTerminal = text.replace(/---START---[\s\S]*?---END---/g, (match) => {
      // Extract just the terminal text content
      const lines = match.split('\n');
      const relevantLines = lines.filter(line => 
        !line.includes('---START---') && 
        !line.includes('---END---') &&
        !line.includes('<div') &&
        !line.includes('</div>') &&
        !line.includes('class=')
      );
      return relevantLines.join('\n');
    });

    // Clean up escaped characters
    return withoutTerminal
      .replace(/\\n/g, '\n')
      .replace(/\\\\/g, '\\')
      .replace(/<[^>]*>/g, ''); // Remove any remaining HTML tags
  };

  const downloadAsText = () => {
    const blob = new Blob([cleanContent(content)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsMarkdown = () => {
    let mdContent = cleanContent(content);
    
    // Add basic markdown formatting if not present
    if (!mdContent.includes('#')) {
      // Add a title if there isn't one
      mdContent = `# ${filename}\n\n${mdContent}`;
    }
    
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsHTML = () => {
    const cleanedContent = cleanContent(content)
      .replace(/\n/g, '<br>')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #333;
    }
    pre {
      background: #f4f4f4;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }
    code {
      background: #f4f4f4;
      padding: 2px 4px;
      border-radius: 2px;
    }
  </style>
</head>
<body>
  <h1>${filename}</h1>
  <div>${cleanedContent}</div>
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAsJSON = () => {
    const jsonContent = {
      filename,
      content: cleanContent(content),
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getIcon = (format: string) => {
    switch (format) {
      case 'md':
        return <FileCode className="w-4 h-4" />;
      case 'html':
        return <FileCode className="w-4 h-4" />;
      case 'json':
        return <FileSpreadsheet className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={downloadAsText}>
          <FileText className="w-4 h-4 mr-2" />
          Download as Text (.txt)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadAsMarkdown}>
          <FileCode className="w-4 h-4 mr-2" />
          Download as Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadAsHTML}>
          <FileCode className="w-4 h-4 mr-2" />
          Download as HTML (.html)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadAsJSON}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Download as JSON (.json)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 