import { Opencode } from "@opencode/sdk";

export const opencode = new Opencode({
  apiKey: process.env.OPENCODE_API_KEY!,
});
