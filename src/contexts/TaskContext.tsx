"use client";

import { createContext, useContext, ReactNode } from "react";
import { useTasks, type UseTasksReturn } from "../hooks/useTasks";

const TaskContext = createContext<UseTasksReturn | null>(null);

interface TaskProviderProps {
  children: ReactNode;
}

export function TaskProvider({ children }: TaskProviderProps) {
  const taskState = useTasks();
  
  return (
    <TaskContext.Provider value={taskState}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext(): UseTasksReturn {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}