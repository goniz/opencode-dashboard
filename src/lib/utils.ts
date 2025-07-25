import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseModelString(modelString: string): { providerID: string; modelID: string } {
  const parts = modelString.split('/');
  if (parts.length > 1) {
    return {
      providerID: parts[0],
      modelID: parts[1]
    };
  }
  
  // Default to openai if no provider specified
  return {
    providerID: "openai",
    modelID: modelString
  };
}