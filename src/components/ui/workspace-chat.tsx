"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import { 
  ChevronLeftIcon, 
  SendHorizontalIcon, 
  CheckIcon,
  XIcon,
  Loader2Icon,
  AlertCircleIcon
} from "lucide-react";
import { useTaskContext } from "@/contexts/TaskContext";
import { Thread } from "@/components/thread";
import { OpenCodeMultiSessionProvider } from "@/components/providers/opencode-multi-session-provider";

interface WorkspaceChatProps {
  className?: string;
  onBackToSidebar?: () => void;
}

export function WorkspaceChat({ 
  className, 
  onBackToSidebar
}: WorkspaceChatProps) {
  const { 
    currentTask, 
    createPlan, 
    approvePlan, 
    rejectPlan, 
    executePlan,
    isLoading
  } = useTaskContext();
  
  const [inputValue, setInputValue] = useState("");
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Focus input when component mounts
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Handle sending a message
  const handleSend = async () => {
    if (!inputValue.trim() || !currentTask) return;
    
    const message = inputValue.trim();
    setInputValue("");
    
    // If there's already a plan, this is a regular chat message
    if (currentTask.plan) {
      // In a real implementation, this would send the message to the chat
      console.log("Sending chat message:", message);
      return;
    }
    
    // Otherwise, generate a plan
    try {
      setIsGeneratingPlan(true);
      setPlanError(null);
      await createPlan(currentTask.id, message, "openai/gpt-4o");
    } catch (err) {
      console.error("Failed to create plan:", err);
      setPlanError(err instanceof Error ? err.message : "Failed to generate plan");
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Handle approving a plan
  const handleApprovePlan = async () => {
    if (!currentTask?.plan) return;
    
    try {
      await approvePlan(currentTask.plan.id);
      // After approval, execute the plan
      await executePlan(currentTask.plan.id);
    } catch (err) {
      console.error("Failed to approve plan:", err);
      setPlanError(err instanceof Error ? err.message : "Failed to approve plan");
    }
  };

  // Handle rejecting a plan
  const handleRejectPlan = async () => {
    if (!currentTask?.plan) return;
    
    try {
      await rejectPlan(currentTask.plan.id);
    } catch (err) {
      console.error("Failed to reject plan:", err);
      setPlanError(err instanceof Error ? err.message : "Failed to reject plan");
    }
  };

  // Handle key press (Enter to send, Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!currentTask) {
    return (
      <div className={cn("flex flex-col h-full bg-gray-900", className)}>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-sm">
            <AlertCircleIcon className="h-16 w-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-medium mb-2 text-white">No Workspace Selected</h3>
            <p className="text-sm text-gray-400 mb-4">Please select a workspace to start chatting.</p>
            <Button onClick={onBackToSidebar} variant="outline">
              Back to Workspaces
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-900", className)}>
      {/* Header */}
      <div className="border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={onBackToSidebar}
            className="flex items-center gap-2 text-gray-300 hover:text-white hover:bg-gray-800"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Back
          </Button>
          <div className="flex-1 min-w-0 px-4">
            <h1 className="text-lg font-semibold text-white truncate">
              {currentTask.title}
            </h1>
            <p className="text-xs text-gray-400 truncate">
              {currentTask.folder.split("/").pop()} • {currentTask.model}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium",
              currentTask.status === "running" ? "bg-green-500/10 text-green-400" :
              currentTask.status === "in-progress" ? "bg-amber-500/10 text-amber-400" :
              currentTask.status === "completed" ? "bg-green-500/10 text-green-400" :
              currentTask.status === "failed" ? "bg-red-500/10 text-red-400" :
              currentTask.status === "pending" ? "bg-blue-500/10 text-blue-400" :
              currentTask.status === "stopped" ? "bg-gray-500/10 text-gray-400" :
              "bg-gray-500/10 text-gray-400"
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                currentTask.status === "running" ? "bg-green-500" :
                currentTask.status === "in-progress" ? "bg-amber-500" :
                currentTask.status === "completed" ? "bg-green-500" :
                currentTask.status === "failed" ? "bg-red-500" :
                currentTask.status === "pending" ? "bg-blue-500" :
                currentTask.status === "stopped" ? "bg-gray-500" :
                "bg-gray-500"
              )} />
              {currentTask.status}
            </div>
          </div>
        </div>
      </div>

      {/* Plan Approval Section */}
      {currentTask.plan && (
        <div className="border-b border-gray-700 p-4 bg-gray-800/50">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-white">Execution Plan</h3>
              <div className={cn(
                "text-xs px-2 py-1 rounded-full",
                currentTask.plan.status === "pending" ? "bg-blue-500/10 text-blue-400" :
                currentTask.plan.status === "approved" ? "bg-green-500/10 text-green-400" :
                currentTask.plan.status === "rejected" ? "bg-red-500/10 text-red-400" :
                currentTask.plan.status === "executing" ? "bg-amber-500/10 text-amber-400" :
                currentTask.plan.status === "completed" ? "bg-green-500/10 text-green-400" :
                "bg-gray-500/10 text-gray-400"
              )}>
                {currentTask.plan.status}
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-3 mb-3 text-sm text-gray-200 font-mono whitespace-pre-wrap">
              {currentTask.plan.content}
            </div>
            
            {planError && (
              <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-200">
                {planError}
              </div>
            )}
            
            {currentTask.plan.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  onClick={handleApprovePlan}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckIcon className="w-4 h-4 mr-2" />
                  Approve
                </Button>
                <Button
                  onClick={handleRejectPlan}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            )}
            
            {(currentTask.plan.status === "approved" || currentTask.plan.status === "executing") && (
              <div className="flex items-center justify-center gap-2 p-2 bg-amber-900/20 rounded">
                <Loader2Icon className="w-4 h-4 animate-spin text-amber-400" />
                <span className="text-sm text-amber-400">Executing plan...</span>
              </div>
            )}
            
            {currentTask.plan.status === "completed" && (
              <div className="flex items-center justify-center gap-2 p-2 bg-green-900/20 rounded">
                <CheckIcon className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Plan executed successfully</span>
              </div>
            )}
            
            {currentTask.plan.status === "rejected" && (
              <div className="flex items-center justify-center gap-2 p-2 bg-red-900/20 rounded">
                <XIcon className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Plan rejected</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <OpenCodeMultiSessionProvider currentSessionId={currentTask.sessions?.[0]?.id}>
          <Thread />
        </OpenCodeMultiSessionProvider>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="max-w-2xl mx-auto">
          {planError && !currentTask.plan && (
            <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-200">
              {planError}
            </div>
          )}
          
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={currentTask.plan ? "Ask a follow-up question..." : "What would you like to do?"}
              disabled={isGeneratingPlan || isLoading}
              className="flex-1 min-h-[44px] max-h-32 resize-none rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-600 disabled:opacity-50"
              rows={1}
            />
            {isGeneratingPlan || isLoading ? (
              <Button
                disabled
                className="h-[44px] w-[44px] p-0 bg-purple-600 hover:bg-purple-700"
              >
                <Loader2Icon className="w-4 h-4 animate-spin" />
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="h-[44px] w-[44px] p-0 bg-purple-600 hover:bg-purple-700"
              >
                <SendHorizontalIcon className="w-4 h-4" />
              </Button>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}