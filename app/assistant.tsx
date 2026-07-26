"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useStreamRuntime } from "@assistant-ui/react-langchain";

import { Thread } from "@/components/assistant-ui/thread";

export function Assistant() {


  const apiUrl = `http://${typeof window !== "undefined" ? window.location.hostname : "localhost"}:2024`;
  // const apiUrl = `http://10.114.155.117:2024`;


  const runtime = useStreamRuntime({
    assistantId: "agent",
    apiUrl,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}
