import type { 
  unstable_RemoteThreadListAdapter as RemoteThreadListAdapter,
  ThreadMessage 
} from "@assistant-ui/react";
import type { OpenCodeSession } from "@/hooks/useOpenCodeWorkspace";

type RemoteThreadListResponse = {
  threads: Array<{
    status: "regular" | "archived";
    remoteId: string;
    externalId?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }>;
};

type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

interface ThreadItem {
  id: string;
  workspaceId: string;
  model: string;
  createdAt: string;
  lastActivity: string;
  status: "active" | "inactive";
  folderName: string;
}

export class OpenCodeThreadListAdapter implements RemoteThreadListAdapter {
  constructor(private getActiveWorkspaces: () => OpenCodeSession[]) {}

  async list(): Promise<RemoteThreadListResponse> {
    const workspaces = this.getActiveWorkspaces();
    
    // Flatten all sessions from all workspaces into thread items
    const threadItems: ThreadItem[] = [];
    
    for (const workspace of workspaces) {
      if (workspace.sessions && workspace.sessions.length > 0) {
        for (const session of workspace.sessions) {
          threadItems.push({
            id: session.id,
            workspaceId: workspace.id,
            model: workspace.model,
            createdAt: session.createdAt,
            lastActivity: session.lastActivity,
            status: session.status,
            folderName: workspace.folder.split("/").pop() || workspace.folder,
          });
        }
      }
    }
    
    return {
      threads: threadItems.map((item) => ({
        status: "regular" as const,
        remoteId: item.id,
        title: `${item.folderName} - ${item.model}`,
        // Optional metadata for sorting/filtering
        metadata: {
          workspaceId: item.workspaceId,
          model: item.model,
          createdAt: item.createdAt,
          lastActivity: item.lastActivity,
          sessionStatus: item.status,
        },
      })),
    };
  }

  async initialize(threadId: string): Promise<RemoteThreadInitializeResponse> {
    // Sessions are created externally via the workspace API
    // This adapter just manages existing sessions, so we return the threadId as remoteId
    return { remoteId: threadId, externalId: undefined };
  }

  async rename(remoteId: string, newTitle: string): Promise<void> {
    // OpenCode doesn't support renaming sessions directly
    // Session titles are derived from workspace folder name and model
    console.log(`Rename not supported for session ${remoteId}. Requested title: ${newTitle}`);
  }

  async archive(remoteId: string): Promise<void> {
    // For now, we don't implement archiving - would need to add API support
    console.log(`Archive not implemented for session ${remoteId}`);
  }

  async unarchive(remoteId: string): Promise<void> {
    console.log(`Unarchive not implemented for session ${remoteId}`);
  }

  async delete(remoteId: string): Promise<void> {
    // Could potentially stop the session, but this is destructive
    // For now, just log the request
    console.log(`Delete not implemented for session ${remoteId}`);
  }

  async generateTitle(_remoteId: string, _messages: readonly ThreadMessage[]): Promise<ReadableStream> {
    // Return empty stream - titles are generated from folder/model info
    // Could potentially generate titles based on conversation content in the future
    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  }
}