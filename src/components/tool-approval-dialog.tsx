"use client";

import { useState } from "react";

interface ToolApprovalDialogProps {
  isOpen: boolean;
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onReject: () => void;
}

export function ToolApprovalDialog({
  isOpen,
  toolName,
  args,
  onApprove,
  onReject
}: ToolApprovalDialogProps) {
  if (!isOpen) return null;

  // OpenCode determines if approval is needed - we just display the dialog

  const formatArgs = (args: Record<string, unknown>) => {
    return Object.entries(args).map(([key, value]) => (
      <div key={key} className="mb-2">
        <span className="font-medium text-gray-700">{key}:</span>
        <div className="mt-1 p-2 bg-gray-50 rounded text-sm font-mono break-all">
          {typeof value === "string" ? value : JSON.stringify(value, null, 2)}
        </div>
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Tool Execution Approval Required
          </h2>
          <p className="mt-2 text-gray-600">
            The assistant wants to execute the following tool:
          </p>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-gray-700">Tool:</span>
              <code className="px-2 py-1 rounded text-sm font-mono bg-blue-100 text-blue-800">
                {toolName}
              </code>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-medium text-gray-700 mb-3">Parameters:</h3>
            <div className="space-y-2">
              {formatArgs(args)}
            </div>
          </div>


        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onReject}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for managing tool approval state
export function useToolApproval() {
  const [pendingApproval, setPendingApproval] = useState<{
    toolName: string;
    args: Record<string, unknown>;
    resolve: (approved: boolean) => void;
  } | null>(null);

  const requestApproval = (toolName: string, args: Record<string, unknown>): Promise<boolean> => {
    return new Promise((resolve) => {
      setPendingApproval({ toolName, args, resolve });
    });
  };

  const handleApprove = () => {
    if (pendingApproval) {
      pendingApproval.resolve(true);
      setPendingApproval(null);
    }
  };

  const handleReject = () => {
    if (pendingApproval) {
      pendingApproval.resolve(false);
      setPendingApproval(null);
    }
  };

  const handleClose = () => {
    if (pendingApproval) {
      pendingApproval.resolve(false);
      setPendingApproval(null);
    }
  };

  return {
    pendingApproval,
    requestApproval,
    handleApprove,
    handleReject,
    handleClose
  };
}