"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "@assistant-ui/react";
import { OpenCodeChatAdapter } from "@/lib/adapters/opencode-chat-adapter";
import { OpenCodeHistoryAdapter } from "@/lib/adapters/opencode-history-adapter";

interface OpenCodeRuntimeProviderProps {
  sessionId: string;
  model: string;
  provider: string;
  children: ReactNode;
}

export function OpenCodeRuntimeProvider({
  sessionId,
  model,
  provider,
  children,
}: OpenCodeRuntimeProviderProps) {
  const adapter = useMemo(
    () => new OpenCodeChatAdapter(sessionId, model, provider),
    [sessionId, model, provider]
  );

  const historyAdapter = useMemo(
    () => new OpenCodeHistoryAdapter(sessionId),
    [sessionId]
  );

  const runtimeOptions: LocalRuntimeOptions = {
    adapters: {
      history: historyAdapter,
    },
  };

  const runtime = useLocalRuntime(adapter, runtimeOptions);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}