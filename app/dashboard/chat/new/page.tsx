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
    prompt: `Please analyze the uploaded property images and generate a comprehensive Detailed Condition Evaluation (DCE) report in tender documentation format.

**IMPORTANT**: You MUST format your response using the special document markers so it can be downloaded:

\`\`\`document:dce-tender-${new Date().toISOString().split('T')[0]}.md
# TENDER DOCUMENTATION
## Property Condition Evaluation Report

### CLIENT
[To be completed]  
[Property Address - based on images]  
[Contact Information]

### DATE
${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

---

## TABLE OF CONTENTS

1. [Property Overview](#property-overview)
2. [Existing Conditions Assessment](#existing-conditions-assessment)
3. [Technical Evaluation by Area](#technical-evaluation-by-area)
4. [Defects and Issues Identified](#defects-and-issues-identified)
5. [Recommended Interventions](#recommended-interventions)
6. [Priority Schedule](#priority-schedule)
7. [Appendices](#appendices)

---

## 1. PROPERTY OVERVIEW {#property-overview}

### 1.1 Property Type
[Based on the uploaded images, identify the property type: residential, commercial, etc.]

### 1.2 Areas Evaluated
[List all areas visible in the uploaded images]

### 1.3 General Condition Summary
[Provide an overall assessment based on visual inspection]

### 1.4 Evaluation Limitations
- Assessment based on photographic evidence only
- No physical measurements taken
- Hidden conditions not evaluated
- Structural elements assessment limited to visible components

---

## 2. EXISTING CONDITIONS ASSESSMENT {#existing-conditions-assessment}

### 2.1 Architectural Elements

#### 2.1.1 Doors and Openings

| Element | Location | Condition | Observations |
|---------|----------|-----------|--------------|
| [Door type] | [Location] | [Excellent/Good/Fair/Poor] | [Detailed observations] |
| [Continue for each door/opening visible] | | | |

#### 2.1.2 Interior Finishes

| Surface | Location | Material | Condition | Notes |
|---------|----------|----------|-----------|-------|
| Walls | [Location] | [Material type] | [Rating] | [Observations] |
| Floors | [Location] | [Material type] | [Rating] | [Observations] |
| Ceilings | [Location] | [Material type] | [Rating] | [Observations] |

### 2.2 Technical Systems (Visible)

| System | Components Visible | Condition | Observations |
|--------|-------------------|-----------|--------------|
| Electrical | [Outlets, switches, panels] | [Rating] | [Details] |
| HVAC | [Units, vents, etc.] | [Rating] | [Details] |
| Plumbing | [Visible fixtures] | [Rating] | [Details] |

---

## 3. TECHNICAL EVALUATION BY AREA {#technical-evaluation-by-area}

### 3.1 [Area 1 - Based on Image 1]

#### Physical Characteristics
- **Dimensions**: [Estimated if possible]
- **Configuration**: [Description]
- **Natural Light**: [Assessment]
- **Ventilation**: [Observable features]

#### Condition Assessment

| Component | Current State | Defects Noted | Action Required |
|-----------|--------------|---------------|-----------------|
| Flooring | [Description] | [Issues] | [Yes/No - Type] |
| Walls | [Description] | [Issues] | [Yes/No - Type] |
| Ceiling | [Description] | [Issues] | [Yes/No - Type] |
| Doors | [Description] | [Issues] | [Yes/No - Type] |
| Windows | [Description] | [Issues] | [Yes/No - Type] |

[Repeat Section 3.1 for each distinct area/image]

---

## 4. DEFECTS AND ISSUES IDENTIFIED {#defects-and-issues-identified}

### 4.1 Critical Issues (Immediate Attention Required)

| ID | Location | Issue Description | Safety Risk | Recommended Action |
|----|----------|------------------|-------------|-------------------|
| C01 | [Location] | [Description] | [Yes/No] | [Action] |
| [Continue as needed] | | | | |

### 4.2 Major Issues (Short-term Attention)

| ID | Location | Issue Description | Impact | Recommended Timeline |
|----|----------|------------------|--------|---------------------|
| M01 | [Location] | [Description] | [Impact level] | [Timeline] |
| [Continue as needed] | | | | |

### 4.3 Minor Issues (Routine Maintenance)

| ID | Location | Issue Description | Priority | Cost Category |
|----|----------|------------------|----------|---------------|
| m01 | [Location] | [Description] | [Low/Medium] | [Low/Medium/High] |
| [Continue as needed] | | | | |

---

## 5. RECOMMENDED INTERVENTIONS {#recommended-interventions}

### 5.1 Immediate Interventions (0-1 month)

| Intervention | Location | Scope of Work | Estimated Duration |
|--------------|----------|---------------|-------------------|
| [Description] | [Location] | [Detailed scope] | [Duration] |

### 5.2 Short-term Interventions (1-6 months)

| Intervention | Location | Scope of Work | Dependencies |
|--------------|----------|---------------|--------------|
| [Description] | [Location] | [Detailed scope] | [Other work required first] |

### 5.3 Long-term Interventions (6-12 months)

| Intervention | Location | Scope of Work | Planning Requirements |
|--------------|----------|---------------|---------------------|
| [Description] | [Location] | [Detailed scope] | [Permits, approvals, etc.] |

---

## 6. PRIORITY SCHEDULE {#priority-schedule}

### 6.1 Work Sequencing

| Phase | Timeline | Work Items | Trades Required |
|-------|----------|------------|-----------------|
| 1 | Week 1-2 | [Critical repairs] | [Trades] |
| 2 | Week 3-4 | [Major repairs] | [Trades] |
| 3 | Month 2 | [Secondary work] | [Trades] |
| 4 | Month 3+ | [Improvements] | [Trades] |

### 6.2 Coordination Requirements

| Work Item | Prerequisites | Coordination Notes |
|-----------|---------------|-------------------|
| [Item] | [Required before] | [Special considerations] |

---

## 7. APPENDICES {#appendices}

### 7.1 PHOTOGRAPHIC DOCUMENTATION

#### Image Analysis Summary

| Image # | Area/Location | Key Observations | Issues Identified |
|---------|---------------|------------------|-------------------|
| 1 | [Location] | [Main features visible] | [Problems noted] |
| 2 | [Location] | [Main features visible] | [Problems noted] |
| [Continue for all images] | | | |

### 7.2 CONDITION RATING CRITERIA

| Rating | Definition | Typical Characteristics |
|--------|------------|------------------------|
| Excellent | Like new condition | No visible wear or defects |
| Good | Minor wear only | Fully functional, minimal cosmetic issues |
| Fair | Moderate wear | Functional but showing age, some repairs needed |
| Poor | Significant deterioration | Major repairs required, functionality compromised |

### 7.3 MAINTENANCE RECOMMENDATIONS

| Component | Maintenance Type | Frequency | Notes |
|-----------|-----------------|-----------|-------|
| Doors | Lubrication, adjustment | Annual | Check hardware |
| Walls | Cleaning, touch-up | As needed | Monitor for cracks |
| Floors | [Based on material] | [Frequency] | [Specific care] |
| [Continue for all components] | | | |

### 7.4 DISCLAIMERS AND LIMITATIONS

1. **Scope Limitations**
   - Visual inspection from photographs only
   - No invasive or destructive testing performed
   - No access to concealed areas
   - No specialized equipment used

2. **Professional Recommendations**
   - Structural concerns require professional engineer evaluation
   - Electrical issues require licensed electrician assessment
   - Plumbing issues require licensed plumber evaluation
   - Major repairs require appropriate permits and inspections

3. **Cost Estimates**
   - No cost estimates provided in this visual assessment
   - Actual costs depend on local market conditions
   - Detailed specifications required for accurate pricing

### 7.5 NEXT STEPS

1. **Immediate Actions**
   - Address all safety-related issues
   - Secure unstable elements
   - Prevent further deterioration

2. **Planning Phase**
   - Obtain professional assessments where indicated
   - Develop detailed specifications
   - Obtain competitive bids
   - Secure necessary permits

3. **Implementation**
   - Establish project timeline
   - Coordinate trades
   - Monitor quality
   - Document completion

---

## REPORT CERTIFICATION

This Detailed Condition Evaluation is based solely on visual inspection of provided photographs. All observations and recommendations are subject to verification through physical inspection by qualified professionals.

**Report Prepared By**: AI Assistant  
**Date**: ${new Date().toLocaleDateString()}  
**Methodology**: Visual analysis of uploaded property images  
**Report Status**: Preliminary Assessment

---
END OF DOCUMENT
\`\`\`

Please analyze each uploaded image carefully and fill in all sections with specific observations. Be thorough and professional in your assessment, using the exact format provided above.`,
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