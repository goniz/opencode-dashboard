import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseModelString(modelString: string): { providerID: string; modelID: string } {
  const firstSlashIndex = modelString.indexOf('/');
  if (firstSlashIndex === -1) {
    throw new Error(`Invalid model format: ${modelString}. Expected format: provider/model`);
  }
  
  return {
    providerID: modelString.substring(0, firstSlashIndex),
    modelID: modelString.substring(firstSlashIndex + 1)
  };
}