"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { FileUploadButton } from "@/components/FileUploadButton";
import { MediaAttachment } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { getConvexClient } from "@/lib/convex";

interface ChatTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
}

const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    id: "dce-generator",
    name: "DCE Report Generator",
    description: "Generate Detailed Condition Evaluation reports from property images",
    prompt: `Please analyze the uploaded property images and generate a comprehensive Detailed Condition Evaluation (DCE) report.

Use the DCE tender documentation template from your system instructions and format it as:
\`\`\`document:dce-tender-${new Date().toISOString().split('T')[0]}.md

Fill in all sections based on your analysis of the uploaded images:
- Replace [Current Date] with: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
- Analyze each image carefully and provide specific observations
- Use professional language and be thorough
- Don't leave any placeholders - fill in actual observations
- Rate conditions as Excellent/Good/Fair/Poor based on what you see
- Identify all visible defects and categorize them (Critical/Major/Minor)
- Provide actionable recommendations

Remember to close the document with \`\`\` at the end.`,
    icon: <FileText className="w-5 h-5" />,
  },
];

export default function NewChatPage() {
  const router = useRouter();
  const [attachments, setAttachments] = useState<MediaAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const createChat = useMutation(api.chats.createChat);

  const selectedTemplate = CHAT_TEMPLATES[0]; // Always use DCE Generator

  const handleStartChat = async () => {
    setIsLoading(true);
    try {
      // Create a new chat
      const chatId = await createChat({ title: selectedTemplate.name });

      // Prepare the initial message with template prompt
      const initialMessage = selectedTemplate.prompt;

      // Send the initial message with attachments
      const convex = getConvexClient();
      await convex.mutation(api.messages.send, {
        chatId,
        content: initialMessage,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Redirect to the chat page
      router.push(`/dashboard/chat/${chatId}`);
    } catch (error) {
      console.error("Error creating chat:", error);
      alert("Failed to create chat. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">DCE Report Generator</h1>
          <p className="text-gray-600">Generate professional tender-style condition evaluation reports from property images</p>
        </div>

        {/* DCE Generator Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                {selectedTemplate.icon}
              </div>
              <span className="text-xl">{selectedTemplate.name}</span>
            </CardTitle>
            <CardDescription className="text-base mt-2">
              {selectedTemplate.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              This AI assistant will analyze your property images and generate a comprehensive tender-style DCE report including:
            </p>
            <ul className="mt-3 space-y-1 text-gray-600 list-disc list-inside">
              <li>Complete property overview with areas evaluated</li>
              <li>Detailed existing conditions assessment with tables</li>
              <li>Technical evaluation by area with condition ratings</li>
              <li>Categorized defects (Critical/Major/Minor)</li>
              <li>Prioritized intervention recommendations</li>
              <li>Implementation schedule and coordination requirements</li>
              <li>Professional maintenance recommendations</li>
            </ul>
          </CardContent>
        </Card>

        {/* File Upload Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Upload Property Images</CardTitle>
            <CardDescription>
              Upload clear images of all property areas requiring evaluation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-gray-600 mb-2">
                  For best results, please upload images showing:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside mb-3">
                  <li>Wide shots of each room/area</li>
                  <li>Close-ups of any damage or wear</li>
                  <li>All doors, windows, and openings</li>
                  <li>Visible technical systems (electrical, HVAC, plumbing)</li>
                  <li>Flooring, walls, and ceiling conditions</li>
                  <li>Any areas of particular concern</li>
                </ul>
                {attachments.length > 0 && (
                  <p className="text-sm text-gray-500">
                    {attachments.length} image{attachments.length > 1 ? "s" : ""} selected
                  </p>
                )}
              </div>
              <FileUploadButton
                onFilesSelected={setAttachments}
                attachments={attachments}
                disabled={isLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Start Chat Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleStartChat}
            disabled={isLoading || attachments.length === 0}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 disabled:bg-gray-400"
          >
            {isLoading ? "Generating DCE Report..." : "Generate DCE Report"}
          </Button>
        </div>
        
        {attachments.length === 0 && (
          <p className="text-center text-sm text-gray-500 mt-4">
            Please upload at least one property image to generate a DCE report
          </p>
        )}
      </div>
    </div>
  );
} 