"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useOpenCodeSession, type UseOpenCodeSessionReturn, type OpenCodeSession } from "./useOpenCodeWorkspace";

// Task/Workspace status types aligned with Google Jules
export type TaskStatus = "pending" | "in-progress" | "completed" | "failed" | "running" | "stopped" | "error";

// Task/Workspace interface mapping Jules Tasks to OpenCode Workspaces
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  folder: string;
  model: string;
  port: number;
  createdAt: Date;
  lastActivity?: Date;
  plan?: TaskPlan;
  sessions?: TaskSession[];
}

// Task Session interface mapping Jules Task Sessions to OpenCode Sessions
export interface TaskSession {
  id: string;
  taskId: string;
  model: string;
  createdAt: Date;
  lastActivity: Date;
  status: "active" | "inactive";
}

// Plan interface for task execution plans
export interface TaskPlan {
  id: string;
  taskId: string;
  content: string;
  status: "pending" | "approved" | "rejected" | "executing" | "completed" | "failed";
  createdAt: Date;
  approvedAt?: Date;
  executedAt?: Date;
}

// Chat message interface
export interface TaskChatMessage {
  id: string;
  taskId: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  planId?: string; // Link to plan if this message is about a plan
}

// Command execution interface
export interface TaskCommandExecution {
  id: string;
  taskId: string;
  sessionId: string;
  command: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// Codebase/Folder interface
export interface Codebase {
  id: string;
  name: string;
  path: string;
  lastModified: Date;
}

// View states for the application
export type TaskView = "sidebar" | "new-task" | "chat";

// Error interface
export interface TaskError {
  message: string;
  recoverySuggestion?: string;
}

// Main state interface
export interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  chatMessages: TaskChatMessage[];
  commandExecutions: TaskCommandExecution[];
  codebases: Codebase[];
  currentView: TaskView;
  isLoading: boolean;
  error: TaskError | null;
}

// Return type for the useTasks hook
export interface UseTasksReturn extends UseOpenCodeSessionReturn {
  // Extended state
  tasks: Task[];
  currentTask: Task | null;
  chatMessages: TaskChatMessage[];
  commandExecutions: TaskCommandExecution[];
  codebases: Codebase[];
  currentView: TaskView;
  error: TaskError | null;
  
  // Task-specific actions
  createTask: (folder: string, model: string, title?: string) => Promise<Task>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  setCurrentTask: (task: Task | null) => void;
  setView: (view: TaskView) => void;
  
  // Chat actions
  addChatMessage: (message: Omit<TaskChatMessage, "id" | "timestamp">) => void;
  loadChatMessages: (taskId: string, sessionId: string) => Promise<void>;
  
  // Plan actions
  createPlan: (taskId: string, prompt: string, planningModel: string) => Promise<TaskPlan>;
  approvePlan: (planId: string) => Promise<void>;
  rejectPlan: (planId: string) => Promise<void>;
  executePlan: (planId: string) => Promise<void>;
  
  // Command execution actions
  executeCommand: (taskId: string, sessionId: string, command: string) => Promise<void>;
  
  // Codebase actions
  loadCodebases: () => Promise<void>;
}

export function useTasks(): UseTasksReturn {
  // Use the existing OpenCode session hook as the foundation
  const openCodeSession = useOpenCodeSession();
  
  // Extended task state
  const [taskState, setTaskState] = useState<TaskState>({
    tasks: [],
    currentTask: null,
    chatMessages: [],
    commandExecutions: [],
    codebases: [],
    currentView: "sidebar",
    isLoading: false,
    error: null,
  });
  
  // Refs for tracking mounted state and pending operations
  const mountedRef = useRef(true);
  const pendingPlans = useRef<Map<string, TaskPlan>>(new Map());
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Update task state helper
  const updateTaskState = useCallback((updates: Partial<TaskState>) => {
    if (!mountedRef.current) return;
    setTaskState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Error handling helper
  const setTaskError = useCallback((error: Error | TaskError | string | null) => {
    if (!error) {
      updateTaskState({ error: null, isLoading: false });
      return;
    }
    
    let taskError: TaskError;
    if (typeof error === "string") {
      taskError = { message: error };
    } else if (error && typeof error === "object" && "recoverySuggestion" in error) {
      taskError = {
        message: error.message,
        recoverySuggestion: error.recoverySuggestion as string,
      };
    } else {
      taskError = { message: error instanceof Error ? error.message : "An unknown error occurred" };
    }
    
    updateTaskState({ error: taskError, isLoading: false });
  }, [updateTaskState]);
  
  
  
  // Load tasks (workspaces) from API
  const loadTasks = useCallback(async () => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/workspaces");
      if (!response.ok) {
        throw new Error("Failed to fetch workspaces");
      }
      
      const workspaces = await response.json();
      const tasks: Task[] = workspaces.map((workspace: any) => ({
        id: workspace.id,
        title: workspace.folder ? `${workspace.folder.split("/").pop()} - ${workspace.model}` : `Workspace ${workspace.id}`,
        status: workspace.status as TaskStatus,
        folder: workspace.folder,
        model: workspace.model,
        port: workspace.port,
        createdAt: new Date(),
        sessions: workspace.sessions?.map((s: any) => ({
          id: s.id,
          taskId: workspace.id,
          model: s.model,
          createdAt: new Date(s.createdAt),
          lastActivity: new Date(s.lastActivity),
          status: s.status,
        })) || [],
      }));
      
      // Preserve currentTask if it still exists in the updated tasks list
      const currentTaskId = taskState.currentTask?.id;
      const updatedCurrentTask = currentTaskId 
        ? tasks.find((t: Task) => t.id === currentTaskId) || null
        : null;
      
      updateTaskState({
        tasks,
        currentTask: updatedCurrentTask,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load tasks:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to load tasks");
    }
  }, [taskState.currentTask, updateTaskState, setTaskError]);
  
  // Create a new task (workspace)
  const createTask = useCallback(async (folder: string, model: string, title?: string): Promise<Task> => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folder, model }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create workspace");
      }
      
      const workspaceData = await response.json();
      const task: Task = {
        id: workspaceData.id,
        title: title || (workspaceData.folder ? `${workspaceData.folder.split("/").pop()} - ${workspaceData.model}` : `Workspace ${workspaceData.id}`),
        status: workspaceData.status as TaskStatus,
        folder: workspaceData.folder,
        model: workspaceData.model,
        port: workspaceData.port,
        createdAt: new Date(),
        sessions: workspaceData.sessions?.map((s: any) => ({
          id: s.id,
          taskId: workspaceData.id,
          model: s.model,
          createdAt: new Date(s.createdAt),
          lastActivity: new Date(s.lastActivity),
          status: s.status,
        })) || [],
      };
      
      updateTaskState({
        tasks: [...taskState.tasks, task],
        currentTask: task,
        currentView: "chat",
        isLoading: false,
      });
      
      return task;
    } catch (error) {
      console.error("Failed to create task:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create task";
      setTaskError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [taskState.tasks, updateTaskState, setTaskError]);
  
  // Update a task
  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>): Promise<void> => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      // Find the task to update
      const taskIndex = taskState.tasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) {
        throw new Error(`Task ${taskId} not found`);
      }
      
      // Update the task
      const updatedTasks = [...taskState.tasks];
      updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], ...updates };
      
      // If this is the current task, update it too
      const updatedCurrentTask = taskState.currentTask?.id === taskId 
        ? { ...taskState.currentTask, ...updates } 
        : taskState.currentTask;
      
      updateTaskState({
        tasks: updatedTasks,
        currentTask: updatedCurrentTask,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to update task";
      setTaskError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [taskState.tasks, taskState.currentTask, updateTaskState, setTaskError]);
  
  // Set current task
  const setCurrentTask = useCallback((task: Task | null) => {
    updateTaskState({ currentTask: task });
  }, [updateTaskState]);
  
  // Set current view
  const setView = useCallback((view: TaskView) => {
    updateTaskState({ currentView: view });
  }, [updateTaskState]);
  
  // Add chat message
  const addChatMessage = useCallback((message: Omit<TaskChatMessage, "id" | "timestamp">) => {
    const newMessage: TaskChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      ...message,
      timestamp: new Date(),
    };
    
    updateTaskState({
      chatMessages: [...taskState.chatMessages, newMessage],
    });
  }, [taskState.chatMessages, updateTaskState]);
  
  // Load chat messages
  const loadChatMessages = useCallback(async (taskId: string, sessionId: string) => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      // In a real implementation, this would fetch messages from the API
      // For now, we'll just clear existing messages for this task/session
      const filteredMessages = taskState.chatMessages.filter(
        msg => !(msg.taskId === taskId && msg.sessionId === sessionId)
      );
      
      updateTaskState({
        chatMessages: filteredMessages,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to load chat messages");
    }
  }, [taskState.chatMessages, updateTaskState, setTaskError]);
  
  // Create plan
  const createPlan = useCallback(async (taskId: string, prompt: string, planningModel: string): Promise<TaskPlan> => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/agent/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, planningModel, workspaceId: taskId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate plan");
      }
      
      const data = await response.json();
      
      if (!data || typeof data.plan !== "string" || !data.plan.trim()) {
        throw new Error("Invalid response: Plan content is missing or empty");
      }
      
      const plan: TaskPlan = {
        id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        taskId,
        content: data.plan,
        status: "pending",
        createdAt: new Date(),
      };
      
      // Store the plan temporarily
      pendingPlans.current.set(plan.id, plan);
      
      // Update the task with the new plan
      const taskIndex = taskState.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        const updatedTasks = [...taskState.tasks];
        updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], plan };
        updateTaskState({ tasks: updatedTasks });
        
        // Update current task if it's the same
        if (taskState.currentTask?.id === taskId) {
          updateTaskState({ currentTask: { ...taskState.currentTask, plan } });
        }
      }
      
      updateTaskState({ isLoading: false });
      return plan;
    } catch (error) {
      console.error("Failed to create plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create plan";
      setTaskError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [taskState.tasks, taskState.currentTask, updateTaskState, setTaskError]);
  
  // Approve plan
  const approvePlan = useCallback(async (planId: string) => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const plan = pendingPlans.current.get(planId);
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }
      
      // Update plan status
      const approvedPlan: TaskPlan = {
        ...plan,
        status: "approved",
        approvedAt: new Date(),
      };
      
      pendingPlans.current.set(planId, approvedPlan);
      
      // Update the task with the approved plan
      const taskIndex = taskState.tasks.findIndex(t => t.id === plan.taskId);
      if (taskIndex !== -1) {
        const updatedTasks = [...taskState.tasks];
        updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], plan: approvedPlan };
        updateTaskState({ tasks: updatedTasks });
        
        // Update current task if it's the same
        if (taskState.currentTask?.id === plan.taskId) {
          updateTaskState({ currentTask: { ...taskState.currentTask, plan: approvedPlan } });
        }
      }
      
      updateTaskState({ isLoading: false });
    } catch (error) {
      console.error("Failed to approve plan:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to approve plan");
      throw new Error("Failed to approve plan");
    }
  }, [taskState.tasks, taskState.currentTask, updateTaskState, setTaskError]);
  
  // Reject plan
  const rejectPlan = useCallback(async (planId: string) => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const plan = pendingPlans.current.get(planId);
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }
      
      // Update plan status
      const rejectedPlan: TaskPlan = {
        ...plan,
        status: "rejected",
      };
      
      pendingPlans.current.set(planId, rejectedPlan);
      
      // Update the task with the rejected plan
      const taskIndex = taskState.tasks.findIndex(t => t.id === plan.taskId);
      if (taskIndex !== -1) {
        const updatedTasks = [...taskState.tasks];
        updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], plan: rejectedPlan };
        updateTaskState({ tasks: updatedTasks });
        
        // Update current task if it's the same
        if (taskState.currentTask?.id === plan.taskId) {
          updateTaskState({ currentTask: { ...taskState.currentTask, plan: rejectedPlan } });
        }
      }
      
      updateTaskState({ isLoading: false });
    } catch (error) {
      console.error("Failed to reject plan:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to reject plan");
      throw new Error("Failed to reject plan");
    }
  }, [taskState.tasks, taskState.currentTask, updateTaskState, setTaskError]);
  
  // Execute plan
  const executePlan = useCallback(async (planId: string) => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const plan = pendingPlans.current.get(planId);
      if (!plan) {
        throw new Error(`Plan ${planId} not found`);
      }
      
      // Update plan status to executing
      const executingPlan: TaskPlan = {
        ...plan,
        status: "executing",
      };
      
      pendingPlans.current.set(planId, executingPlan);
      
      // Update the task with the executing plan
      const taskIndex = taskState.tasks.findIndex(t => t.id === plan.taskId);
      if (taskIndex !== -1) {
        const updatedTasks = [...taskState.tasks];
        updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], plan: executingPlan };
        updateTaskState({ tasks: updatedTasks });
        
        // Update current task if it's the same
        if (taskState.currentTask?.id === plan.taskId) {
          updateTaskState({ currentTask: { ...taskState.currentTask, plan: executingPlan } });
        }
      }
      
      updateTaskState({ isLoading: false });
      
      // In a real implementation, this would execute the plan
      // For now, we'll just mark it as completed after a delay
      setTimeout(() => {
        if (!mountedRef.current) return;
        
        const completedPlan: TaskPlan = {
          ...executingPlan,
          status: "completed",
          executedAt: new Date(),
        };
        
        pendingPlans.current.set(planId, completedPlan);
        
        // Update the task with the completed plan
        const taskIndex = taskState.tasks.findIndex(t => t.id === plan.taskId);
        if (taskIndex !== -1) {
          const updatedTasks = [...taskState.tasks];
          updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], plan: completedPlan };
          updateTaskState({ tasks: updatedTasks });
          
          // Update current task if it's the same
          if (taskState.currentTask?.id === plan.taskId) {
            updateTaskState({ currentTask: { ...taskState.currentTask, plan: completedPlan } });
          }
        }
        
        updateTaskState({ isLoading: false });
      }, 2000);
    } catch (error) {
      console.error("Failed to execute plan:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to execute plan");
      throw new Error("Failed to execute plan");
    }
  }, [taskState.tasks, taskState.currentTask, updateTaskState, setTaskError]);
  
  // Execute command
  const executeCommand = useCallback(async (taskId: string, sessionId: string, command: string) => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      // Create command execution record
      const execution: TaskCommandExecution = {
        id: `cmd_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        taskId,
        sessionId,
        command,
        status: "pending",
        startedAt: new Date(),
      };
      
      // Add to command executions
      updateTaskState({
        commandExecutions: [...taskState.commandExecutions, execution],
        isLoading: false,
      });
      
      // In a real implementation, this would execute the command
      // For now, we'll just simulate execution
      setTimeout(() => {
        if (!mountedRef.current) return;
        
        const updatedExecutions = taskState.commandExecutions.map(exec => 
          exec.id === execution.id 
            ? { ...exec, status: "completed" as const, completedAt: new Date(), output: "Command executed successfully" } 
            : exec
        );
        
        updateTaskState({ commandExecutions: updatedExecutions });
      }, 1000);
    } catch (error) {
      console.error("Failed to execute command:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to execute command");
      throw new Error("Failed to execute command");
    }
  }, [taskState.commandExecutions, updateTaskState, setTaskError]);
  
  // Load codebases
  const loadCodebases = useCallback(async () => {
    updateTaskState({ isLoading: true, error: null });
    
    try {
      const response = await fetch("/api/folders");
      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }
      
      const folders = await response.json();
      const codebases: Codebase[] = folders.map((folder: { name: string; path: string }) => ({
        id: `folder_${folder.path}`,
        name: folder.name,
        path: folder.path,
        lastModified: new Date(), // In a real implementation, this would come from fs stats
      }));
      
      updateTaskState({
        codebases,
        isLoading: false,
      });
    } catch (error) {
      console.error("Failed to load codebases:", error);
      setTaskError(error instanceof Error ? error.message : "Failed to load codebases");
    }
  }, [updateTaskState, setTaskError]);
  
  // Load tasks and codebases on mount
  useEffect(() => {
    loadTasks();
    loadCodebases();
  }, [loadTasks, loadCodebases]);
  
  // Return the combined interface
  return {
    // State (inherited from OpenCode session)
    sessions: openCodeSession.sessions,
    currentSession: taskState.currentTask as unknown as OpenCodeSession, // Override with task equivalent
    isLoading: taskState.isLoading || openCodeSession.isLoading, // Combine loading states
    error: taskState.error, // Override with task error
    isConnected: openCodeSession.isConnected,
    connectionStatus: openCodeSession.connectionStatus,
    
    // Actions (inherited from OpenCode session)
    loadSessions: openCodeSession.loadSessions,
    createSession: openCodeSession.createSession,
    createOpenCodeSession: openCodeSession.createOpenCodeSession,
    switchToSession: openCodeSession.switchToSession,
    stopSession: openCodeSession.stopSession,
    refreshSession: openCodeSession.refreshSession,
    loadSessionMessages: openCodeSession.loadSessionMessages,
    clearError: openCodeSession.clearError,
    reconnectSSE: openCodeSession.reconnectSSE,
    
    // Extended task state
    tasks: taskState.tasks,
    currentTask: taskState.currentTask,
    chatMessages: taskState.chatMessages,
    commandExecutions: taskState.commandExecutions,
    codebases: taskState.codebases,
    currentView: taskState.currentView,
    
    // Task-specific actions
    createTask,
    updateTask,
    setCurrentTask,
    setView,
    
    // Chat actions
    addChatMessage,
    loadChatMessages,
    
    // Plan actions
    createPlan,
    approvePlan,
    rejectPlan,
    executePlan,
    
    // Command execution actions
    executeCommand,
    
    // Codebase actions
    loadCodebases,
  };
}