import { SSE_DONE_MESSAGE } from "./types";
import { StreamMessageType } from "./types";
import { SSE_DATA_PREFIX } from "./types";
import { StreamMessage } from "./types";

/**
 * Processes a single SSE line and converts it to a StreamMessage
 * @param line - Single line from the SSE stream
 * @returns StreamMessage or null if line should be skipped
 */
const processLine = (line: string): StreamMessage | null => {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;

  if (!trimmedLine.startsWith(SSE_DATA_PREFIX)) return null;

  const data = trimmedLine.substring(SSE_DATA_PREFIX.length);

  if (data === SSE_DONE_MESSAGE) {
    return { type: StreamMessageType.Done };
  }

  try {
    const parsedData = JSON.parse(data) as StreamMessage;
    if (Object.values(StreamMessageType).includes(parsedData.type)) {
      return parsedData;
    }
    return null;
  } catch (e) {
    console.error("Error parsing SSE data:", e);
    return {
      type: StreamMessageType.Error,
      error: "Failed to parse SSE message",
    };
  }
};

/**
 * Parses SSE chunks into an array of StreamMessages using functional programming
 * @param buffer - Current buffer state
 * @param chunk - New chunk to process
 * @returns Tuple of [new buffer state, array of parsed messages]
 */
const parseChunk = (
  buffer: string,
  chunk: string
): [string, StreamMessage[]] => {
  const combinedBuffer = buffer + chunk;
  const lines = combinedBuffer.split("\n");
  const newBuffer = lines.pop() || "";

  const messages = lines
    .map(processLine)
    .filter((msg): msg is StreamMessage => msg !== null);

  return [newBuffer, messages];
};

/**
 * Server-Sent Events (SSE) Parser
 * Functional approach to parsing streaming data from AI agent responses
 */
export const createSSEParser = () => {
  let buffer = "";

  return {
    parse: (chunk: string): StreamMessage[] => {
      const [newBuffer, messages] = parseChunk(buffer, chunk);
      buffer = newBuffer;
      return messages;
    },
  };
};
