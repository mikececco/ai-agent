import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  StreamMessage,
  StreamMessageType,
  SSE_DATA_PREFIX,
  SSE_DONE_MESSAGE,
} from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export class SSEParser {
  private buffer: string = "";

  parse(chunk: string): StreamMessage[] {
    this.buffer += chunk;
    const messages: StreamMessage[] = [];
    const lines = this.buffer.split("\n");

    // Keep the last line in buffer if it's incomplete
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue; // Skip empty lines

      if (trimmedLine.startsWith(SSE_DATA_PREFIX)) {
        const data = trimmedLine.substring(SSE_DATA_PREFIX.length);
        if (data === SSE_DONE_MESSAGE) {
          messages.push({ type: StreamMessageType.Done });
          continue;
        }

        try {
          const parsedData = JSON.parse(data) as StreamMessage;
          // Validate the message type
          if (Object.values(StreamMessageType).includes(parsedData.type)) {
            messages.push(parsedData);
          }
        } catch (e) {
          console.error("Error parsing SSE data:", e);
          messages.push({
            type: StreamMessageType.Error,
            error: "Failed to parse SSE message",
          });
        }
      }
    }

    return messages;
  }
}
