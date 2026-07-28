import { getAccessToken } from "@/core/auth/token.service";
import { getApiBaseUrl } from "@/core/config/env";
import type { StudioSseEventName } from "@/features/studio/types/studio.types";

export interface StudioSseEvent {
  event: StudioSseEventName | string;
  data: string;
}

export async function streamChatMessage(
  projectId: string,
  message: string,
  onEvent: (event: StudioSseEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(`${getApiBaseUrl()}/api/studio/projects/${projectId}/chat/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message }),
    signal,
  });

  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(text || "Không thể kết nối stream AI.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const lines = block.split("\n");
      const eventLine = lines.find((line) => line.startsWith("event:"));
      const dataLines = lines.filter((line) => line.startsWith("data:"));
      if (!eventLine || dataLines.length === 0) continue;

      const eventName = eventLine.replace("event:", "").trim();
      const data = dataLines.map((line) => line.replace("data:", "").trim()).join("\n");
      onEvent({ event: eventName, data });
    }
  }
}

