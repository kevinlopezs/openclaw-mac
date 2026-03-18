import { parseConfig } from "./config.js";
import { McpClientPool } from "./mcp-client.js";

let globalPool: McpClientPool | null = null;
let globalRegisteredTools: any[] = [];
let isConnecting = false;
let globalToolsReady = false;

export default function (api: any) {
  const config = parseConfig(api.pluginConfig);

  if (config.servers.length === 0) {
    console.log("[mcp-adapter] No servers configured");
    return;
  }

  if (globalToolsReady) {
    for (const tool of globalRegisteredTools) {
      api.registerTool(tool);
    }
    return;
  }

  const pool = globalPool ?? new McpClientPool();
  globalPool = pool;

  // Use service lifecycle - connections only happen when gateway starts
  api.registerService({
    id: "mcp-adapter",

    async start() {
      if (isConnecting) return;
      isConnecting = true;
      try {
        globalRegisteredTools = [];
        for (const server of config.servers) {
          try {
            console.log(`[mcp-adapter] Connecting to ${server.name}...`);
            await pool.connect(server);

            const tools = await pool.listTools(server.name);
            console.log(`[mcp-adapter] ${server.name}: found ${tools.length} tools`);

            for (const tool of tools) {
              const toolName = config.toolPrefix ? `${server.name}_${tool.name}` : tool.name;

              const toolDef = {
                name: toolName,
                description: tool.description ?? `Tool from ${server.name}`,
                parameters: tool.inputSchema ?? { type: "object", properties: {} },
                async execute(_id: string, params: unknown) {
                  const result = await pool.callTool(server.name, tool.name, params);
                  const text =
                    result.content?.map((c: any) => c.text ?? c.data ?? "").join("\n") ?? "";
                  return {
                    content: [{ type: "text", text }],
                    isError: result.isError,
                  };
                },
              };

              api.registerTool(toolDef);
              globalRegisteredTools.push(toolDef);

              console.log(`[mcp-adapter] Registered: ${toolName}`);
            }
          } catch (err) {
            console.error(`[mcp-adapter] Failed to connect to ${server.name}:`, err);
          }
        }
        globalToolsReady = true;
      } finally {
        isConnecting = false;
      }
    },

    async stop() {
      console.log("[mcp-adapter] Shutting down...");
      await pool.closeAll();
      globalPool = null;
      globalToolsReady = false;
      isConnecting = false;
      console.log("[mcp-adapter] All connections closed");
    },
  });
}
