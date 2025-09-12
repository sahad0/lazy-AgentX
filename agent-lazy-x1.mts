#!/usr/bin/env node

// agent-lazy-x1.mts - AgentLazyX1 Main Entry Point

import { AgentLazyX1MCPServer } from './src/mcp/AgentLazyX1MCPServer.js';

// Start the MCP server
async function main() {
  try {
    const mcpServer = new AgentLazyX1MCPServer();
    await mcpServer.start();
  } catch (error) {
    console.error('Failed to start AgentLazyX1 MCP server:', error);
    process.exit(1);
  }
}

main();
