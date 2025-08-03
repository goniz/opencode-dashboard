"use client";

import type { ReactNode } from "react";
import { useMemo, useEffect, useState } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "@assistant-ui/react";
import type { AssistantTool, AssistantToolUI } from "@assistant-ui/react";
import { OpenCodeChatAdapter } from "@/lib/adapters/opencode-chat-adapter";
import { OpenCodeHistoryAdapter } from "@/lib/adapters/opencode-history-adapter";
import { OpenCodeFileAttachmentAdapter } from "@/lib/adapters/opencode-attachment-adapter";
import { ToolApprovalDialog, useToolApproval } from "@/components/tool-approval-dialog";
import { OpenCodeConnectionStatus } from "@/components/opencode-connection-status";
import { 
  OpenCodeGenericToolUI, 
  BashToolUI, 
  ReadToolUI, 
  EditToolUI 
} from "@/components/tool-ui/opencode-tool-ui";

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
  const { pendingApproval, requestApproval, handleApprove, handleReject } = useToolApproval();

  const adapter = useMemo(
    () => new OpenCodeChatAdapter(sessionId, model, provider),
    [sessionId, model, provider]
  );

  const historyAdapter = useMemo(
    () => new OpenCodeHistoryAdapter(sessionId),
    [sessionId]
  );

  const fileAttachmentAdapter = useMemo(
    () => new OpenCodeFileAttachmentAdapter(sessionId),
    [sessionId]
  );



  // State for dynamically loaded tools
  const [tools, setTools] = useState<AssistantTool[]>([]);
  const [toolUIs, setToolUIs] = useState<AssistantToolUI[]>([]);

  // Load tools dynamically when session changes
  useEffect(() => {
    async function loadTools() {
      try {
        // For now, set empty tools array until tools API is implemented
        setTools([]);
        setToolUIs([]);
      } catch (error) {
        console.error("Failed to load OpenCode tools:", error);
        setTools([]);
        setToolUIs([]);
      }
    }

    loadTools();
  }, [sessionId, requestApproval]);

  const runtimeOptions: LocalRuntimeOptions = {
    adapters: {
      history: historyAdapter,
      attachments: fileAttachmentAdapter, // Use file adapter as primary
    },
  };

  const runtime = useLocalRuntime(adapter, runtimeOptions);

  return (
    <>
      <AssistantRuntimeProvider runtime={runtime}>
        {/* Show OpenCode connection status */}
        <OpenCodeConnectionStatus sessionId={sessionId} />
        
        {/* Render tools */}
        {tools.map((Tool, index) => (
          <Tool key={index} />
        ))}
        {/* Render tool UIs */}
        {toolUIs.map((ToolUI, index) => (
          <ToolUI key={`ui-${index}`} />
        ))}
        
        {/* OpenCode Tool UIs */}
        <OpenCodeGenericToolUI />
        <BashToolUI />
        <ReadToolUI />
        <EditToolUI />
        
        {children}
      </AssistantRuntimeProvider>
      
      {/* Tool approval dialog */}
      {pendingApproval && (
        <ToolApprovalDialog
          isOpen={true}
          toolName={pendingApproval.toolName}
          args={pendingApproval.args}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </>
  );
}