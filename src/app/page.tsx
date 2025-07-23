"use client";

import { useState } from "react";
import FolderSelector from "@/components/folder-selector";
import ModelSelector from "@/components/model-selector";
import SessionStarter from "@/components/session-starter";
import SessionDashboard from "@/components/session-dashboard";

type AppState = "folder-selection" | "model-selection" | "session-ready" | "session-running";

interface SessionData {
  sessionId: string;
  port: number;
  folder: string;
  model: string;
}

export default function Home() {
  const [appState, setAppState] = useState<AppState>("folder-selection");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  const handleFolderSelect = (path: string) => {
    setSelectedFolder(path);
    setAppState("model-selection");
  };

  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    setAppState("session-ready");
  };

  const handleSessionStart = (data: { sessionId: string; port: number }) => {
    setSessionData({
      sessionId: data.sessionId,
      port: data.port,
      folder: selectedFolder!,
      model: selectedModel!,
    });
    setAppState("session-running");
  };

  const handleSessionStop = () => {
    setSessionData(null);
    setAppState("folder-selection");
    setSelectedFolder(null);
    setSelectedModel(null);
  };

  const handleBackToFolderSelection = () => {
    setAppState("folder-selection");
    setSelectedFolder(null);
    setSelectedModel(null);
  };

  const handleBackToModelSelection = () => {
    setAppState("model-selection");
    setSelectedModel(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            OpenCode Dashboard
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            {appState === "folder-selection" && "Select a folder from your filesystem to get started"}
            {appState === "model-selection" && "Choose an AI model for your OpenCode session"}
            {appState === "session-ready" && "Ready to start your OpenCode session"}
            {appState === "session-running" && "Your OpenCode session is running"}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${appState !== "folder-selection" ? "text-green-600" : "text-blue-600"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                appState !== "folder-selection" ? "bg-green-500" : "bg-blue-500"
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Folder</span>
            </div>
            
            <div className={`w-8 h-0.5 ${appState === "model-selection" || appState === "session-ready" || appState === "session-running" ? "bg-green-500" : "bg-gray-300"}`}></div>
            
            <div className={`flex items-center ${
              appState === "session-ready" || appState === "session-running" ? "text-green-600" : 
              appState === "model-selection" ? "text-blue-600" : "text-gray-400"
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                appState === "session-ready" || appState === "session-running" ? "bg-green-500" :
                appState === "model-selection" ? "bg-blue-500" : "bg-gray-300"
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Model</span>
            </div>
            
            <div className={`w-8 h-0.5 ${appState === "session-running" ? "bg-green-500" : "bg-gray-300"}`}></div>
            
            <div className={`flex items-center ${appState === "session-running" ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                appState === "session-running" ? "bg-green-500" : "bg-gray-300"
              }`}>
                3
              </div>
              <span className="ml-2 text-sm font-medium">Session</span>
            </div>
          </div>
        </div>

        {/* Main content based on app state */}
        {appState === "folder-selection" && (
          <FolderSelector onFolderSelect={handleFolderSelect} />
        )}

        {appState === "model-selection" && (
          <div className="space-y-4">
            <ModelSelector onModelSelect={handleModelSelect} />
            <div className="text-center">
              <button
                onClick={handleBackToFolderSelection}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to folder selection
              </button>
            </div>
          </div>
        )}

        {appState === "session-ready" && selectedFolder && selectedModel && (
          <div className="space-y-4">
            <SessionStarter
              folder={selectedFolder}
              model={selectedModel}
              onSessionStart={handleSessionStart}
            />
            <div className="text-center">
              <button
                onClick={handleBackToModelSelection}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 text-sm"
              >
                ← Back to model selection
              </button>
            </div>
          </div>
        )}

        {appState === "session-running" && sessionData && (
          <SessionDashboard
            sessionData={sessionData}
            onSessionStop={handleSessionStop}
          />
        )}
      </div>
    </div>
  );
}
