import {
  MessageConverter,
  openCodeToUseChat,
  useChatToOpenCode as convertUseChatToOpenCode,
  extractTextContent,
  extractToolCalls,
  getMessageType,
  createTextMessage,
} from "./message-converter";
import type { OpenCodeUserMessage, OpenCodeAssistantMessage } from "./message-types";
import type { Message as UseChatMessage } from "ai";

function runTests() {
  console.log("🧪 Testing Message Converter Utilities");
  console.log("=====================================");

  // Test 1: OpenCode to useChat conversion
  console.log("\n1. Testing OpenCode to useChat conversion:");
  const openCodeMessage: OpenCodeUserMessage = {
    id: "test-1",
    role: "user",
    createdAt: "2024-01-01T00:00:00Z",
    parts: [
      {
        type: "text",
        text: "Hello, world!",
      },
    ],
  };

  const useChatResult = openCodeToUseChat(openCodeMessage);
  console.log("✅ OpenCode message:", JSON.stringify(openCodeMessage, null, 2));
  console.log("✅ Converted to useChat:", JSON.stringify(useChatResult, null, 2));

  // Test 2: useChat to OpenCode conversion
  console.log("\n2. Testing useChat to OpenCode conversion:");
  const useChatMessage: UseChatMessage = {
    id: "test-2",
    role: "assistant",
    content: "Hello back!",
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  const openCodeResult = convertUseChatToOpenCode(useChatMessage);
  console.log("✅ useChat message:", JSON.stringify(useChatMessage, null, 2));
  console.log("✅ Converted to OpenCode:", JSON.stringify(openCodeResult, null, 2));

  // Test 3: Tool message conversion
  console.log("\n3. Testing tool message conversion:");
  const toolMessage: OpenCodeAssistantMessage = {
    id: "test-3",
    role: "assistant",
    createdAt: "2024-01-01T00:00:00Z",
    parts: [
      {
        type: "text",
        text: "I'll help you with that.",
      },
      {
        type: "tool",
        toolCallId: "call-1",
        toolName: "search",
        args: { query: "test" },
        result: { results: ["item1", "item2"] },
        state: "completed",
      },
    ],
  };

  const toolResult = openCodeToUseChat(toolMessage);
  console.log("✅ OpenCode tool message:", JSON.stringify(toolMessage, null, 2));
  console.log("✅ Converted to useChat:", JSON.stringify(toolResult, null, 2));

  // Test 4: Content extraction
  console.log("\n4. Testing content extraction:");
  const textContent = extractTextContent(toolMessage);
  const toolCalls = extractToolCalls(toolMessage);
  const messageType = getMessageType(toolMessage);

  console.log("✅ Extracted text:", textContent);
  console.log("✅ Extracted tool calls:", JSON.stringify(toolCalls, null, 2));
  console.log("✅ Message type:", messageType);

  // Test 5: Message creation helpers
  console.log("\n5. Testing message creation helpers:");
  const { opencode, usechat } = createTextMessage("user", "Test message", {
    id: "custom-id",
    timestamp: new Date("2024-01-01T00:00:00Z"),
  });

  console.log("✅ Created OpenCode message:", JSON.stringify(opencode, null, 2));
  console.log("✅ Created useChat message:", JSON.stringify(usechat, null, 2));

  // Test 6: MessageConverter with options
  console.log("\n6. Testing MessageConverter with custom options:");
  const converter = new MessageConverter({
    preserveIds: false,
    includeTimestamps: false,
    extractFileContent: true,
  });

  const fileMessage: OpenCodeUserMessage = {
    id: "original-id",
    role: "user",
    createdAt: "2024-01-01T00:00:00Z",
    parts: [
      { type: "text", text: "Check this file:" },
      { type: "file", path: "/test.txt", content: "file content here" },
    ],
  };

  const customResult = converter.openCodeToUseChat(fileMessage);
  console.log("✅ Original message:", JSON.stringify(fileMessage, null, 2));
  console.log("✅ Custom conversion result:", JSON.stringify(customResult, null, 2));

  console.log("\n🎉 All tests completed successfully!");
}

// Only run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

export { runTests };