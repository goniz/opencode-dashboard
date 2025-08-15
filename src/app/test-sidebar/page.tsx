"use client";

import { useState } from "react";
import { TaskProvider } from "@/contexts/TaskContext";
import { OpenCodeSidebar } from "@/components/ui/opencode-sidebar";

export default function TestSidebarPage() {
  const [currentView, setCurrentView] = useState<"sidebar" | "new-task" | "chat">("sidebar");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const handleOpenWorkspace = (workspaceId: string) => {
    setSelectedTaskId(workspaceId);
    setCurrentView("chat");
  };

  const handleCreateNewWorkspace = () => {
    setCurrentView("new-task");
  };

  return (
    <TaskProvider>
      <div className="flex h-screen bg-gray-900">
        <div className="w-80 h-full">
          <OpenCodeSidebar 
            onOpenWorkspace={handleOpenWorkspace}
            onCreateNewWorkspace={handleCreateNewWorkspace}
          />
        </div>
        <div className="flex-1 p-8">
          <div className="bg-gray-800 rounded-lg p-6 h-full">
            <h1 className="text-2xl font-bold text-white mb-4">OpenCode Sidebar Test</h1>
            <div className="bg-gray-700 rounded p-4">
              <p className="text-gray-200">
                Current View: <span className="font-mono text-purple-400">{currentView}</span>
              </p>
              {selectedTaskId && (
                <p className="text-gray-200 mt-2">
                  Selected Task ID: <span className="font-mono text-purple-400">{selectedTaskId}</span>
                </p>
              )}
              <div className="mt-4">
                <button 
                  onClick={() => setCurrentView("sidebar")}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 mr-2"
                >
                  Show Sidebar
                </button>
                <button 
                  onClick={() => setCurrentView("new-task")}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  New Task View
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TaskProvider>
  );
}