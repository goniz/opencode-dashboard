import { workspaceManager } from "@/lib/opencode-workspace";
import { parseModelIdentifier } from "@/lib/models";
import type { Opencode } from "@opencode-ai/sdk";

export async function POST(req: Request) {
  try {
    const { prompt, planningModel, workspaceId } = await req.json();

    if (!prompt || !planningModel || !workspaceId) {
      return new Response(JSON.stringify({ error: "Missing prompt, planningModel, or workspaceId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const workspace = workspaceManager.getWorkspace(workspaceId);
    if (!workspace || workspace.status !== "running" || !workspace.client) {
      return new Response(JSON.stringify({ error: "Workspace not found or not running" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a temporary session through the workspace manager so it is tracked
    const managedSession = await workspaceManager.createSession(workspaceId, planningModel);
    const systemPrompt = `You are a planning expert for a software development AI agent. Your task is to create a detailed, step-by-step plan for the user's request. The plan should be broken down into clear, actionable steps. Output the plan as a numbered list inside a markdown block. Do not add any other text before or after the plan.`;

    const { providerID, modelID } = parseModelIdentifier(planningModel);

    const assistantMessageInfo = await workspace.client.session.chat(managedSession.id, {
      modelID,
      providerID,
      parts: [{ type: "text", text: prompt }],
      system: systemPrompt,
    });

    const messages = await workspace.client.session.messages(managedSession.id);
    const matchingMessage = messages.find(m => m.info.id === assistantMessageInfo.id);

    if (matchingMessage) {
      const textPart = matchingMessage.parts.find(p => p.type === 'text') as Opencode.TextPart | undefined;
      if (textPart) {
        // Cleanup the temporary session before returning
        try {
          workspaceManager.deleteSession(workspaceId, managedSession.id);
        } catch (e) {
          console.warn("[PlanAPI] Failed to delete temporary session:", e);
        }
        return new Response(JSON.stringify({ plan: textPart.text }), {
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Cleanup the temporary session on failure as well
    try {
      workspaceManager.deleteSession(workspaceId, managedSession.id);
    } catch (e) {
      console.warn("[PlanAPI] Failed to delete temporary session on error path:", e);
    }
    return new Response(JSON.stringify({ error: "Could not generate plan" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error generating plan:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
