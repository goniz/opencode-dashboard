"use client";

import { useState } from "react";
import { WorkspaceChat } from "@/components/ui/workspace-chat";
import { TaskProvider } from "@/contexts/TaskContext";

export default function TestChatPage() {
  const [currentView, setCurrentView] = useState<"chat" | "sidebar">("chat");

  const handleBackToSidebar = () => {
    setCurrentView("sidebar");
  };

  if (currentView === "sidebar") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-lg border border-gray-700 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Back to Sidebar</h1>
          <p className="text-gray-300 mb-6">This would normally take you back to the sidebar view.</p>
          <button
            onClick={() => setCurrentView("chat")}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Back to Chat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900">
      <TaskProvider>
        <WorkspaceChat 
          onBackToSidebar={handleBackToSidebar}
        />
      </TaskProvider>
    </div>
  );
}