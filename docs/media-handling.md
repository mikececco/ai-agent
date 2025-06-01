# Media Handling in AI Agent Chat

This document explains how media files (images, videos, documents, audio) are handled in the AI Agent chat application using LangGraph.

## Overview

The media handling system allows users to upload and send files along with their messages. The system supports:
- **Images**: JPEG, PNG, GIF, WebP
- **Videos**: MP4, WebM, OGG
- **Audio**: MP3, WAV, OGG, WebM
- **Documents**: PDF, TXT, DOC, DOCX

## How It Works

### Frontend Flow

1. **File Selection**: Users click the paperclip button next to the input field
2. **File Validation**: Files are validated for size (max 10MB) and type
3. **Base64 Encoding**: Files are converted to base64 data URLs for transmission
4. **Preview**: Selected files are shown with file type icons and size
5. **Submission**: Files are sent along with the message text

### Backend Flow

1. **API Route**: The `/api/chat/stream` endpoint receives messages with attachments
2. **Storage**: Attachments are stored in Convex database along with the message
3. **LangGraph Processing**: 
   - Images are formatted for Claude's vision API
   - Other file types can be processed through tools or text extraction
4. **Streaming Response**: The AI can reference and analyze the uploaded media

## Implementation Details

### Type Definitions

```typescript
export interface MediaAttachment {
  type: "image" | "video" | "document" | "audio";
  mimeType: string;
  data: string; // Base64 encoded data
  name?: string;
  size?: number;
}
```

### Key Components

1. **FileUploadButton**: Handles file selection and validation
2. **MediaDisplay**: Renders media attachments in messages
3. **MessageBubble**: Updated to display attachments
4. **ChatInterface**: Manages attachment state and submission

### LangGraph Integration

Images are converted to Claude's expected format:

```typescript
{
  type: "image",
  source: {
    type: "base64",
    media_type: "image/jpeg",
    data: "base64_string_here"
  }
}
```

## Usage Example

1. Click the paperclip icon in the chat input
2. Select one or more files
3. Preview shows below the input field
4. Type your message (optional)
5. Send the message with attachments

The AI can then analyze images, reference documents, or process the uploaded media as part of the conversation.

## Limitations

- Maximum file size: 10MB per file
- Claude currently only supports image analysis directly
- Other file types may require tool integration for processing
- Base64 encoding increases payload size

## Future Enhancements

- Support for file URLs instead of base64
- Integration with cloud storage (S3, Cloudinary)
- Automatic text extraction from documents
- Audio transcription support
- Video frame extraction for analysis 