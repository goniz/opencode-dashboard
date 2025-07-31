import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function parseModelString(modelString: string): { providerID: string; modelID: string } {
  const firstSlashIndex = modelString.indexOf('/');
  
  // If already in provider/model format, parse it directly
  if (firstSlashIndex !== -1) {
    return {
      providerID: modelString.substring(0, firstSlashIndex),
      modelID: modelString.substring(firstSlashIndex + 1)
    };
  }
  
  // If no provider specified, infer from model name
  let providerID: string;
  
  if (modelString.startsWith('claude') || modelString.includes('sonnet') || modelString.includes('haiku') || modelString.includes('opus')) {
    providerID = 'anthropic';
  } else if (modelString.startsWith('gpt') || modelString.includes('turbo')) {
    providerID = 'openai';
  } else if (modelString.startsWith('gemini')) {
    providerID = 'google';
  } else {
    // Default to anthropic for unknown models, but could also throw an error
    providerID = 'anthropic';
  }
  
  return {
    providerID,
    modelID: modelString
  };
}