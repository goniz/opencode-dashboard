/**
 * Process Health Check API
 * 
 * Provides health status information about OpenCode processes and cleanup handlers.
 * This endpoint can be used for monitoring and debugging the process cleanup system.
 */

import { NextResponse } from 'next/server';
import { workspaceManager } from '@/lib/opencode-workspace';
import { shutdownManager } from '@/lib/shutdown-manager';
import { areSignalHandlersInitialized, areExceptionHandlersInitialized } from '@/lib/process-cleanup';

export async function GET() {
  try {
    const workspaces = workspaceManager.getAllWorkspaces();
    const shutdownStatus = shutdownManager.getStatus();
    
    // Count workspace statuses
    const statusCounts = workspaces.reduce((counts, workspace) => {
      counts[workspace.status] = (counts[workspace.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    // Check process health
    let healthyProcesses = 0;
    let orphanedProcesses = 0;
    
    for (const workspace of workspaces) {
      if (workspace.process && workspace.status === 'running') {
        try {
          // Check if process is still alive
          if (workspace.process.pid) {
            process.kill(workspace.process.pid, 0); // Signal 0 just checks existence
            healthyProcesses++;
          }
        } catch {
          // Process doesn't exist
          orphanedProcesses++;
        }
      }
    }

    const healthStatus = {
      timestamp: new Date().toISOString(),
      overall: {
        status: shutdownStatus.isShuttingDown ? 'shutting_down' : 'healthy',
        totalWorkspaces: workspaces.length,
        healthyProcesses,
        orphanedProcesses,
        statusCounts
      },
      cleanup: {
        shutdownManagerInitialized: shutdownStatus.initialized,
        processCleanupInitialized: shutdownStatus.processCleanupInitialized,
        signalHandlersInitialized: areSignalHandlersInitialized(),
        exceptionHandlersInitialized: areExceptionHandlersInitialized(),
        isShuttingDown: shutdownStatus.isShuttingDown
      },
      configuration: shutdownStatus.config,
      workspaces: workspaces.map(workspace => ({
        id: workspace.id,
        status: workspace.status,
        port: workspace.port,
        folder: workspace.folder,
        model: workspace.model,
        sessionCount: workspace.sessions.size,
        processInfo: workspace.processMetadata ? {
          pid: workspace.processMetadata.pid,
          startTime: workspace.processMetadata.startTime,
          uptime: Date.now() - workspace.processMetadata.startTime.getTime()
        } : null,
        hasProcess: !!workspace.process,
        processAlive: workspace.process?.pid ? (() => {
          try {
            process.kill(workspace.process!.pid!, 0);
            return true;
          } catch {
            return false;
          }
        })() : false,
        error: workspace.error ? {
          message: workspace.error.message,
          recoverySuggestion: workspace.error.recoverySuggestion
        } : null
      }))
    };

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error('[HealthCheck] Error getting process health status:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get process health status',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}