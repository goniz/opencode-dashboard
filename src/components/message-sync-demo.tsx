"use client";

import { useState } from "react";
import { Button } from "../../button";
import { MessageSynchronizer } from "@/lib/message-sync";
import type { Message as UseChatMessage } from "ai";
import type { OpenCodeSession } from "@/lib/opencode-session";

export function MessageSyncDemo() {
  const [logs, setLogs] = useState<string[]>([]);
  const [synchronizer] = useState(() => new MessageSynchronizer({
    enableRealTimeSync: false,
    deduplicationEnabled: true,
  }));

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const mockSession: OpenCodeSession = {
    id: "demo-session",
    folder: "/demo",
    model: "gpt-4",
    port: 3000,
    process: null,
    client: {
      session: {
        messages: async () => [
          {
            id: "msg1",
            role: "user",
            content: "Hello from OpenCode",
            createdAt: "2023-01-01T00:00:00Z",
          },
          {
            id: "msg2",
            role: "assistant",
            content: "Hi there! This is from OpenCode session.",
            createdAt: "2023-01-01T00:01:00Z",
          },
        ],
      },
    } as unknown as OpenCodeSession["client"],
    status: "running",
  };

  const mockUseChatMessages: UseChatMessage[] = [
    {
      id: "msg1",
      role: "user",
      content: "Hello from useChat",
      createdAt: new Date("2023-01-01T00:00:00Z"),
    },
    {
      id: "msg3",
      role: "user",
      content: "This message only exists in useChat",
      createdAt: new Date("2023-01-01T00:02:00Z"),
    },
  ];

  const testInitialization = () => {
    try {
      const state = synchronizer.initializeSync("demo-session", mockUseChatMessages);
      addLog(`✅ Initialization successful. Message hashes: ${state.messageHashes.size}`);
    } catch (error) {
      addLog(`❌ Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testSynchronization = async () => {
    try {
      addLog("🔄 Starting synchronization from OpenCode...");
      const result = await synchronizer.synchronizeMessages(
        "demo-session",
        mockSession
      );
      
      addLog(`✅ Sync completed. Success: ${result.success}`);
      addLog(`📊 Stats - Total: ${result.stats.total}, From OpenCode: ${result.stats.fromOpenCode}, Skipped: ${result.stats.skipped}`);
      addLog(`📝 Total synced messages: ${result.syncedMessages.length}`);
    } catch (error) {
      addLog(`❌ Synchronization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const testGetMessages = async () => {
    try {
      addLog("🔄 Testing get messages from OpenCode...");
      const messages = await synchronizer.getMessagesFromOpenCode("demo-session", mockSession);
      
      addLog(`✅ Retrieved ${messages.length} messages from OpenCode`);
      messages.forEach((msg, index) => {
        addLog(`📝 Message ${index + 1}: ${msg.role} - "${msg.content?.substring(0, 50)}..."`);
      });
    } catch (error) {
      addLog(`❌ Get messages failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const cleanup = () => {
    synchronizer.cleanup("demo-session");
    addLog("🧹 Cleanup completed");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Message Synchronization Demo</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Test Controls</h2>
          
          <div className="space-y-2">
            <Button onClick={testInitialization} className="w-full">
              Test Initialization
            </Button>
            
            <Button onClick={testSynchronization} className="w-full">
              Test Synchronization from OpenCode
            </Button>
            
            <Button onClick={testGetMessages} className="w-full">
              Test Get Messages from OpenCode
            </Button>
            
            <div className="flex gap-2">
              <Button onClick={clearLogs} variant="outline" className="flex-1">
                Clear Logs
              </Button>
              <Button onClick={cleanup} variant="outline" className="flex-1">
                Cleanup
              </Button>
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Test Logs</h2>
          
          <div className="bg-muted/30 rounded-lg p-4 h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-sm">No logs yet. Run some tests to see results.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mock Data Display */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-md font-semibold mb-2">Mock useChat Messages</h3>
          <div className="bg-muted/30 rounded-lg p-4">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(mockUseChatMessages, null, 2)}
            </pre>
          </div>
        </div>
        
        <div>
          <h3 className="text-md font-semibold mb-2">Mock OpenCode Messages</h3>
          <div className="bg-muted/30 rounded-lg p-4">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify([
                {
                  id: "msg1",
                  role: "user",
                  content: "Hello from OpenCode",
                  createdAt: "2023-01-01T00:00:00Z",
                },
                {
                  id: "msg2",
                  role: "assistant",
                  content: "Hi there! This is from OpenCode session.",
                  createdAt: "2023-01-01T00:01:00Z",
                },
              ], null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}