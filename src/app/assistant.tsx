"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";

export const Assistant = () => {
  // Note: This component is deprecated in favor of OpenCodeChatInterface
  // which properly handles OpenCode sessions
  const runtime = useChatRuntime({
    api: "/api/placeholder", // Placeholder API - this component should not be used
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="grid h-dvh grid-cols-[200px_1fr] gap-x-2 px-4 py-4">
        <div className="flex items-center justify-center col-span-2">
          <p className="text-muted-foreground">This component is deprecated. Use OpenCodeChatInterface instead.</p>
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
};
