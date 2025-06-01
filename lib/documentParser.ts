export interface ParsedDocument {
  filename: string;
  extension: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface ParsedContent {
  hasDocuments: boolean;
  documents: ParsedDocument[];
  contentWithPlaceholders: string;
}

export function parseDocumentBlocks(text: string): ParsedContent {
  const documentRegex = /```document:([^\n]+)\n([\s\S]*?)```/g;
  const documents: ParsedDocument[] = [];
  let contentWithPlaceholders = text;
  let offset = 0;

  let match;
  while ((match = documentRegex.exec(text)) !== null) {
    const fullMatch = match[0];
    const filename = match[1].trim();
    const content = match[2];
    const startIndex = match.index;
    const endIndex = startIndex + fullMatch.length;

    // Extract extension from filename
    const lastDotIndex = filename.lastIndexOf('.');
    const extension = lastDotIndex > 0 ? filename.substring(lastDotIndex + 1) : 'txt';

    documents.push({
      filename,
      extension,
      content: content.trim(),
      startIndex,
      endIndex,
    });

    // Replace the document block with a placeholder
    const placeholder = `[DOCUMENT: ${filename}]`;
    const adjustedStart = startIndex - offset;
    const adjustedEnd = endIndex - offset;
    
    contentWithPlaceholders = 
      contentWithPlaceholders.substring(0, adjustedStart) + 
      placeholder + 
      contentWithPlaceholders.substring(adjustedEnd);
    
    offset += fullMatch.length - placeholder.length;
  }

  return {
    hasDocuments: documents.length > 0,
    documents,
    contentWithPlaceholders,
  };
}

export function reconstructContentWithDocuments(
  parsedContent: ParsedContent,
  renderDocument: (doc: ParsedDocument, index: number) => string
): string {
  let reconstructed = parsedContent.contentWithPlaceholders;
  
  parsedContent.documents.forEach((doc, index) => {
    const placeholder = `[DOCUMENT: ${doc.filename}]`;
    const replacement = renderDocument(doc, index);
    reconstructed = reconstructed.replace(placeholder, replacement);
  });
  
  return reconstructed;
} 