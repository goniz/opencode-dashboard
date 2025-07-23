import { createServer } from "http";
import type { AddressInfo } from "net";

interface NodeError extends Error {
  code?: string;
}

export async function findAvailablePort(startPort: number = 3001): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    
    server.listen(startPort, () => {
      const address = server.address() as AddressInfo;
      const port = address?.port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on("error", (err: NodeError) => {
      if (err.code === "EADDRINUSE") {
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}