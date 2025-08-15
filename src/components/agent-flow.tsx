"use client";

import { useState, useEffect } from "react";
import ModelSelector from "./model-selector";
import { Button } from "./button";
import SimpleMarkdownText from "./simple-markdown-text";
import { useOpenCodeSessionContext } from "@/contexts/OpenCodeWorkspaceContext";

type FlowStep = "PROMPT_INPUT" | "PLAN_APPROVAL" | "CODING" | "CODE_APPROVAL";

export default function AgentFlow() {
  const { currentSession } = useOpenCodeSessionContext();
  const [step, setStep] = useState<FlowStep>("PROMPT_INPUT");
  const [prompt, setPrompt] = useState("");
  const [planningModel, setPlanningModel] = useState<string | null>(null);
  const [codingModel, setCodingModel] = useState<string | null>(null);
  const [plan, setPlan] = useState("");
  const [code, setCode] = useState("");
  const [codingLog, setCodingLog] = useState<string[]>([]);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  const handlePlanGeneration = async () => {
    console.log('[AgentFlow] Plan generation started');
    console.log('[AgentFlow] Parameters:', {
      hasPrompt: !!prompt,
      promptLength: prompt.length,
      planningModel,
      hasCurrentSession: !!currentSession,
      currentSessionId: currentSession?.id
    });
    
    if (!prompt || !planningModel || !currentSession) {
      console.error('[AgentFlow] Missing required parameters:', {
        hasPrompt: !!prompt,
        hasPlanningModel: !!planningModel,
        hasCurrentSession: !!currentSession
      });
      return;
    }

    setIsGeneratingPlan(true);
    setPlanError(null);

    try {
      // Add timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[AgentFlow] Request timeout triggered');
        controller.abort();
      }, 60000); // 60 second timeout

      const requestBody = { prompt, planningModel, workspaceId: currentSession.id };
      console.log('[AgentFlow] Sending request to /api/agent/plan:', requestBody);
      
      const response = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      console.log('[AgentFlow] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[AgentFlow] Server error response:', errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AgentFlow] Response data:', data);
      
      // Validate API response
      if (!data || typeof data.plan !== 'string' || !data.plan.trim()) {
        console.error('[AgentFlow] Invalid response structure:', data);
        throw new Error('Invalid response: Plan content is missing or empty');
      }

      console.log('[AgentFlow] Plan generated successfully, length:', data.plan.length);
      setPlan(data.plan);
      setStep('PLAN_APPROVAL');
    } catch (error) {
      console.error('[AgentFlow] Plan generation failed:', error);
      console.error('[AgentFlow] Error details:', {
        type: error?.constructor?.name,
        message: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.log('[AgentFlow] Request was aborted (timeout)');
          setPlanError('Request timed out. Please try again.');
        } else {
          setPlanError(error.message || 'Failed to generate plan. Please try again.');
        }
      } else {
        setPlanError('An unexpected error occurred. Please try again.');
      }
    } finally {
      console.log('[AgentFlow] Plan generation completed, cleaning up');
      setIsGeneratingPlan(false);
    }
  };

  const handlePlanApproval = () => {
    setStep("CODING");
    // Mock code generation
    setTimeout(() => {
      setCode(`
import React from 'react';

const MyComponent = () => {
  return <div>Hello, World!</div>;
};

export default MyComponent;
      `);
      setStep("CODE_APPROVAL");
    }, 2000);
  };

  const handleCodeApproval = () => {
    // Final step
    alert("Code approved and submitted!");
  };

  useEffect(() => {
    if (step === "CODING") {
      setCodingLog([]);
      const messages = [
        "Thinking...",
        "Okay, I understand the plan. I will now start implementing the code.",
        "Calling tool `create_file` with path `src/components/new-component.tsx`...",
        "Tool `create_file` executed successfully.",
        "Calling tool `read_file` with path `src/components/new-component.tsx`...",
        "Tool `read_file` executed successfully.",
        "Analyzing the generated code...",
        "The code looks good. I will now add the content.",
        "Calling tool `replace_with_block`...",
        "Tool `replace_with_block` executed successfully.",
        "Implementation complete."
      ];

      let i = 0;
      const interval = setInterval(() => {
        if (i < messages.length) {
          setCodingLog(prevLog => [...prevLog, messages[i]]);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setCode(`
import React from 'react';

const NewComponent = () => {
  return <div>This is a new component!</div>;
};

export default NewComponent;
            `);
            setStep("CODE_APPROVAL");
          }, 1000);
        }
      }, 1500);

      return () => clearInterval(interval);
    }
  }, [step]);

  const renderStep = () => {
    switch (step) {
      case "PROMPT_INPUT":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Describe Your Task</h2>
            <p className="text-muted-foreground mb-6">
              Provide a detailed description of the task you want the agent to perform.
            </p>
            <textarea
              className="w-full h-48 p-4 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/50"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="For example: 'Implement a new component that displays a list of users from an API endpoint...'"
            />
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Planning Model</h3>
                <ModelSelector folderPath="./" onModelSelect={setPlanningModel} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4">Coding Model</h3>
                <ModelSelector folderPath="./" onModelSelect={setCodingModel} />
              </div>
            </div>
            <div className="mt-8 text-right">
              <Button 
                onClick={handlePlanGeneration} 
                size="lg" 
                disabled={!prompt || !planningModel || !codingModel || isGeneratingPlan}
              >
                {isGeneratingPlan ? 'Generating Plan...' : 'Generate Plan'}
              </Button>
            </div>
            {planError && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <p className="font-medium">Error generating plan:</p>
                <p>{planError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setPlanError(null)}
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        );
      case "PLAN_APPROVAL":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Approve the Plan</h2>
            <p className="text-muted-foreground mb-6">
              The agent has generated a plan. Please review it and approve or revise.
            </p>
            <div className="p-6 border border-border rounded-lg bg-background">
              <SimpleMarkdownText content={plan} />
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <Button variant="outline" size="lg" onClick={() => setStep("PROMPT_INPUT")}>
                Revise
              </Button>
              <Button size="lg" onClick={handlePlanApproval}>Approve Plan</Button>
            </div>
          </div>
        );
      case "CODING":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Implementing Plan</h2>
            <p className="text-muted-foreground mb-6">
              The agent is now writing the code. You can see the progress below.
            </p>
            <div className="p-6 border rounded-lg bg-black text-white font-mono text-sm h-96 overflow-y-auto">
              {codingLog.map((line, index) => {
                const isToolCall = line.includes("Calling tool");
                return (
                  <div key={index} className="whitespace-pre-wrap">
                    <span className={isToolCall ? "text-cyan-400" : "text-white"}>
                      {line}
                    </span>
                    {index === codingLog.length - 1 && <span className="animate-pulse">_</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      case "CODE_APPROVAL":
        return (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground mb-2">Approve the Code</h2>
            <p className="text-muted-foreground mb-6">
              The agent has generated the code. Please review it and approve or revise.
            </p>
            <div className="rounded-lg bg-black text-white">
              <div className="flex items-center justify-between gap-4 rounded-t-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                <span>generated-code.tsx</span>
              </div>
              <pre className="overflow-x-auto p-4">
                <code>{code}</code>
              </pre>
            </div>
            <div className="mt-8 flex justify-end gap-4">
              <Button variant="outline" size="lg" onClick={() => setStep("PLAN_APPROVAL")}>
                Revise
              </Button>
              <Button size="lg" onClick={handleCodeApproval}>Approve and Submit</Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return <div className="p-8">{renderStep()}</div>;
}
