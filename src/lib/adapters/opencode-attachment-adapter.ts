import type { AttachmentAdapter, PendingAttachment, CompleteAttachment, Attachment } from "@assistant-ui/react";

export class OpenCodeFileAttachmentAdapter implements AttachmentAdapter {
  accept = "text/*,.js,.jsx,.ts,.tsx,.py,.java,.cpp,.c,.h,.css,.html,.xml,.json,.yaml,.yml,.md,.txt,.sh,.bash,.sql,.go,.rs,.php,.rb,.swift,.kt,.scala,.clj,.hs,.elm,.vue,.svelte";

  constructor(private sessionId: string) {}

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    // Validate file type for code files
    const allowedExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h',
      '.css', '.html', '.xml', '.json', '.yaml', '.yml', '.md', '.txt',
      '.sh', '.bash', '.sql', '.go', '.rs', '.php', '.rb', '.swift',
      '.kt', '.scala', '.clj', '.hs', '.elm', '.vue', '.svelte'
    ];

    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    const isCodeFile = allowedExtensions.includes(fileExtension);
    
    if (!isCodeFile && file.type && !file.type.startsWith('text/')) {
      throw new Error(`Unsupported file type: ${file.type}. Only code and text files are supported.`);
    }

    return {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: "file" as const,
      name: file.name,
      contentType: file.type || 'text/plain',
      file: file,
      status: {
        type: "requires-action" as const,
        reason: "composer-send" as const
      }
    };
  }

  async remove(attachment: Attachment): Promise<void> {
    // Remove file from OpenCode session
    await fetch("/api/opencode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.sessionId,
        action: "remove_file",
        parameters: { fileId: attachment.id }
      })
    });
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    // Read file content
    const content = await this.readFileContent(attachment.file);
    
    // Upload to OpenCode session
    const response = await fetch("/api/opencode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.sessionId,
        action: "upload_file",
        parameters: {
          fileName: attachment.name,
          content: content,
          mimeType: attachment.contentType
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file: ${response.statusText}`);
    }

    return {
      id: attachment.id,
      type: attachment.type,
      name: attachment.name,
      contentType: attachment.contentType,
      status: { type: "complete" as const },
      content: [{
        type: "text" as const,
        text: `File attached: ${attachment.name}\n\`\`\`\n${content}\n\`\`\``
      }]
    };
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target?.result;
        if (typeof content === 'string') {
          resolve(content);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsText(file);
    });
  }
}

export class OpenCodeImageAttachmentAdapter implements AttachmentAdapter {
  accept = "image/*";

  constructor(private sessionId: string) {}

  async add({ file }: { file: File }): Promise<PendingAttachment> {
    // Validate image file
    if (!file.type.startsWith('image/')) {
      throw new Error(`Invalid file type: ${file.type}. Only image files are supported.`);
    }

    return {
      id: `image_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      type: "image" as const,
      name: file.name,
      contentType: file.type,
      file: file,
      status: {
        type: "requires-action" as const,
        reason: "composer-send" as const
      }
    };
  }

  async remove(attachment: Attachment): Promise<void> {
    // Remove image from OpenCode session
    await fetch("/api/opencode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.sessionId,
        action: "remove_image",
        parameters: { imageId: attachment.id }
      })
    });
  }

  async send(attachment: PendingAttachment): Promise<CompleteAttachment> {
    // Convert to base64 for transmission
    const base64Content = await this.fileToBase64(attachment.file);
    
    // Upload to OpenCode session
    const response = await fetch("/api/opencode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: this.sessionId,
        action: "upload_image",
        parameters: {
          fileName: attachment.name,
          content: base64Content,
          mimeType: attachment.contentType
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to upload image: ${response.statusText}`);
    }

    return {
      id: attachment.id,
      type: attachment.type,
      name: attachment.name,
      contentType: attachment.contentType,
      status: { type: "complete" as const },
      content: [{
        type: "image" as const,
        image: URL.createObjectURL(attachment.file)
      }]
    };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          // Remove data URL prefix to get just the base64 content
          const base64 = result.split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      
      reader.readAsDataURL(file);
    });
  }
}