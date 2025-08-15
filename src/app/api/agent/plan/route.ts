import { workspaceManager } from "@/lib/opencode-workspace";
import { parseModelIdentifier } from "@/lib/models";
import type { Opencode } from "@opencode-ai/sdk";

// Utility function for cleaning up temporary sessions
async function cleanupTempSession(workspaceId: string, sessionId: string): Promise<void> {
  try {
    console.log(`[PlanAPI] Cleaning up temporary session ${sessionId} for workspace ${workspaceId}`);
    workspaceManager.deleteSession(workspaceId, sessionId);
    console.log(`[PlanAPI] Successfully cleaned up session ${sessionId}`);
  } catch (e) {
    console.warn("[PlanAPI] Failed to delete temporary session:", e);
  }
}

export async function POST(req: Request) {
  let managedSession: { id: string } | null = null;
  let workspaceId: string | null = null;

  console.log('[PlanAPI] Plan generation request received');
  
  try {
    const requestBody = await req.json();
    console.log('[PlanAPI] Request body:', JSON.stringify(requestBody, null, 2));
    
    const { prompt, planningModel, workspaceId: wsId } = requestBody;
    workspaceId = wsId;
    
    console.log('[PlanAPI] Extracted parameters:', {
      promptLength: prompt?.length,
      planningModel,
      workspaceId,
      hasPrompt: !!prompt,
      hasPlanningModel: !!planningModel,
      hasWorkspaceId: !!workspaceId
    });

    if (!prompt || !planningModel || !workspaceId) {
      console.error('[PlanAPI] Missing required fields:', {
        hasPrompt: !!prompt,
        hasPlanningModel: !!planningModel,
        hasWorkspaceId: !!workspaceId
      });
      return new Response(JSON.stringify({ error: "Missing prompt, planningModel, or workspaceId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate input types
    if (typeof prompt !== 'string' || typeof planningModel !== 'string' || typeof workspaceId !== 'string') {
      console.error('[PlanAPI] Invalid input types:', {
        promptType: typeof prompt,
        planningModelType: typeof planningModel,
        workspaceIdType: typeof workspaceId
      });
      return new Response(JSON.stringify({ error: "Invalid input types" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate prompt length (prevent extremely long prompts)
    if (prompt.length > 10000) {
      console.error(`[PlanAPI] Prompt too long: ${prompt.length} characters (max: 10000)`);
      return new Response(JSON.stringify({ error: "Prompt too long (maximum 10000 characters)" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log(`[PlanAPI] Looking for workspace: ${workspaceId}`);
    const workspace = workspaceManager.getWorkspace(workspaceId);
    
    if (!workspace) {
      console.error(`[PlanAPI] Workspace not found: ${workspaceId}`);
      return new Response(JSON.stringify({ error: "Workspace not found or not running" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    console.log(`[PlanAPI] Workspace found. Status: ${workspace.status}, Has client: ${!!workspace.client}`);
    
    if (workspace.status !== "running" || !workspace.client) {
      console.error(`[PlanAPI] Workspace not ready. Status: ${workspace.status}, Has client: ${!!workspace.client}`);
      return new Response(JSON.stringify({ error: "Workspace not found or not running" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a temporary session through the workspace manager so it is tracked
    console.log(`[PlanAPI] Creating temporary session for model: ${planningModel}`);
    managedSession = await workspaceManager.createSession(workspaceId, planningModel);
    console.log(`[PlanAPI] Created session: ${managedSession.id}`);
    
    const systemPrompt = `You are a planning expert for a software development AI agent. Your task is to create a detailed, step-by-step plan for the user's request. The plan should be broken down into clear, actionable steps. Output the plan as a numbered list inside a markdown block. Do not add any other text before or after the plan.`;

    const { providerID, modelID } = parseModelIdentifier(planningModel);
    console.log(`[PlanAPI] Parsed model identifier - Provider: ${providerID}, Model: ${modelID}`);

    console.log(`[PlanAPI] Initiating chat with session ${managedSession.id}`);
    const chatStartTime = Date.now();
    
    const assistantMessageInfo = await workspace.client.session.chat(managedSession.id, {
      modelID,
      providerID,
      parts: [{ type: "text", text: prompt }],
      system: systemPrompt,
    });
    
    const chatDuration = Date.now() - chatStartTime;
    console.log(`[PlanAPI] Chat completed in ${chatDuration}ms. Message ID: ${assistantMessageInfo?.id}`);
    console.log(`[PlanAPI] Full chat response:`, JSON.stringify(assistantMessageInfo, null, 2));

    console.log(`[PlanAPI] Retrieving messages from session ${managedSession.id}`);
    const messages = await workspace.client.session.messages(managedSession.id);
    console.log(`[PlanAPI] Retrieved ${messages.length} messages`);
    console.log(`[PlanAPI] Message IDs:`, messages.map(m => ({ id: m.info.id, role: m.info.role })));
    
    const matchingMessage = messages.find(m => m.info.id === assistantMessageInfo?.id);
    console.log(`[PlanAPI] Looking for message ID: ${assistantMessageInfo?.id}`);
    console.log(`[PlanAPI] Found matching message: ${!!matchingMessage}`);

    if (matchingMessage) {
      console.log(`[PlanAPI] Processing message with ${matchingMessage.parts.length} parts`);
      const textPart = matchingMessage.parts.find(p => p.type === 'text') as Opencode.TextPart | undefined;
      
      if (textPart) {
        console.log(`[PlanAPI] Found text part. Length: ${textPart.text?.length || 0}`);
        console.log(`[PlanAPI] Text content preview: ${textPart.text?.substring(0, 100)}...`);
        
        if (textPart.text && textPart.text.trim()) {
          console.log(`[PlanAPI] Plan generation successful. Cleaning up session.`);
          await cleanupTempSession(workspaceId, managedSession.id);
          return new Response(JSON.stringify({ plan: textPart.text }), {
            headers: { "Content-Type": "application/json" },
          });
        } else {
          console.error(`[PlanAPI] Text part is empty or contains only whitespace`);
        }
      } else {
        console.error(`[PlanAPI] No text part found in message parts:`, matchingMessage.parts.map(p => p.type));
      }
    } else {
      console.error(`[PlanAPI] No matching message found. Available message IDs:`, messages.map(m => m.info.id));
    }

    // Cleanup the temporary session on failure
    console.error('[PlanAPI] Plan generation failed - no valid response received');
    if (managedSession) {
      await cleanupTempSession(workspaceId, managedSession.id);
    }
    return new Response(JSON.stringify({ error: "Could not generate plan or received empty response" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('[PlanAPI] Exception occurred during plan generation:');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');
    
    // Log additional context
    console.error('Context:', {
      workspaceId,
      sessionId: managedSession?.id,
      hasWorkspace: !!workspaceManager.getWorkspace(workspaceId || ''),
    });
    
    // Cleanup session in case of any error
    if (managedSession && workspaceId) {
      await cleanupTempSession(workspaceId, managedSession.id);
    }
    
    // Provide more specific error messages
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
        errorMessage = "Request timed out. Please try again.";
      } else if (error.message.includes('network') || error.message.includes('NETWORK')) {
        errorMessage = "Network error. Please check your connection.";
      } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
        errorMessage = "Service temporarily unavailable. Please try again later.";
      } else if (error.message.includes('API key') || error.message.includes('authentication')) {
        errorMessage = "Authentication error. Please check API configuration.";
      } else if (error.message.includes('model') && error.message.includes('not found')) {
        errorMessage = "Model not available. Please try a different model.";
      }
    }
    
    console.error(`[PlanAPI] Returning error response: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  console.log('[PlanAPI] Plan generation request completed');
}
