"use client";

import { useState } from "react";
import { NewWorkspaceForm } from "@/components/ui/new-workspace-form";

export default function TestFormPage() {
  const [currentView, setCurrentView] = useState<"form" | "success">("form");
  const [createdWorkspaceId, setCreatedWorkspaceId] = useState<string | null>(null);

  const handleBackToSidebar = () => {
    console.log("Back to sidebar clicked");
  };

  const handleWorkspaceCreated = (workspaceId: string) => {
    setCreatedWorkspaceId(workspaceId);
    setCurrentView("success");
  };

  if (currentView === "success" && createdWorkspaceId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-8 bg-gray-800 rounded-lg border border-gray-700 max-w-md">
          <h1 className="text-2xl font-bold text-white mb-4">Workspace Created!</h1>
          <p className="text-gray-300 mb-6">Successfully created workspace with ID: {createdWorkspaceId}</p>
          <button
            onClick={() => setCurrentView("form")}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
          >
            Create Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900">
      <NewWorkspaceForm 
        onBackToSidebar={handleBackToSidebar}
        onWorkspaceCreated={handleWorkspaceCreated}
      />
    </div>
  );
}