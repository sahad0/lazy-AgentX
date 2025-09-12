# Premium LangGraph + MCP SDK Architecture

A production-ready Model Context Protocol (MCP) server that provides intelligent Jira integration through LangGraph agents and n8n-style workflow engine.

## 🏗️ Premium Architecture

This project implements enterprise-grade patterns following LangGraph and MCP SDK best practices:

```
src/
├── agents/          # LangGraph agents (core intelligence)
│   └── JiraAgent.ts # Main Jira agent with workflow integration
├── mcp/             # MCP server implementation
│   └── JiraMCPServer.ts # Exposes LangGraph agents as MCP tools
├── nodes/           # Workflow node implementations
│   ├── BaseNode.ts  # Base class for all nodes
│   └── JiraNode.ts  # Jira-specific node
├── engine/          # Workflow execution engine
│   └── WorkflowEngine.ts
├── workflows/       # Predefined workflow definitions
│   └── jira-workflow.ts
└── types/           # Type definitions for workflow system
    └── index.ts
```

## 🚀 Key Features

- **LangGraph-Powered**: Core intelligence powered by LangGraph agents
- **MCP SDK Integration**: Standardized tool exposure via MCP protocol
- **n8n-Style Workflows**: Extensible node-based workflow system
- **Enterprise Ready**: Production-grade architecture patterns
- **TypeScript**: Full type safety and modern development experience
- **Cursor Integration**: Seamless integration with Cursor IDE

## 🎯 Architecture Benefits

### 1. **Separation of Concerns**

- **LangGraph**: Handles AI reasoning and workflow orchestration
- **MCP SDK**: Manages tool exposure and client communication
- **Workflow Engine**: Executes business logic through nodes

### 2. **Scalability**

- Easy to add new agents for different domains
- Extensible node system for complex workflows
- Standardized MCP protocol for tool integration

### 3. **Production Ready**

- Proper error handling and logging
- Type-safe implementations
- Modular architecture for easy testing

## 🔧 Usage

### Environment Setup

```bash
# Required environment variables
export JIRA_DOMAIN="https://your-domain.atlassian.net"
export JIRA_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-jira-api-token"
```

### Running the System

```bash
# Development mode with hot reload
yarn dev

# Production MCP server
yarn mcp

# LangGraph API server (alternative deployment)
yarn langgraph:start

# Development LangGraph server
yarn langgraph:dev
```

### Cursor Integration

The MCP server exposes a `jira_agent` tool that provides:

- **Intelligent Jira Queries**: Natural language processing of Jira requests
- **Workflow Execution**: n8n-style workflow processing
- **AI-Enhanced Responses**: Context-aware ticket summaries
- **Multi-format Support**: Handles ticket keys, URLs, and descriptions

## 🏭 Production Deployment

### Option 1: Direct MCP Server

```bash
yarn mcp
```

- Runs as stdio MCP server
- Direct integration with Cursor
- Best for development and single-user scenarios

### Option 2: LangGraph API Server

```bash
yarn langgraph:start
```

- Runs as HTTP server with `/mcp` endpoint
- Supports multiple clients
- Better for production and team environments

## 🔌 Extending the System

### Adding New Agents

1. Create agent class in `src/agents/`
2. Implement workflow integration
3. Register in MCP server

### Adding New Workflow Nodes

1. Extend `BaseNode` class
2. Implement `getDefinition()` and `execute()` methods
3. Register in `WorkflowEngine`

### Adding New Workflows

1. Create workflow definitions in `src/workflows/`
2. Define node connections and parameters
3. Integrate with agents

## 🚀 Future Enhancements

- **Multi-Agent Orchestration**: Coordinate multiple specialized agents
- **Advanced Workflows**: Complex branching and parallel execution
- **Visual Workflow Editor**: n8n-style drag-and-drop interface
- **Enterprise Integrations**: GitHub, Slack, email, CRM systems
- **Real-time Monitoring**: Workflow execution tracking and analytics
- **Custom Node Marketplace**: Community-driven node ecosystem

## 🛠️ Development

```bash
# Install dependencies
yarn install

# Format code
yarn format

# Build TypeScript
yarn build

# Run tests (when implemented)
yarn test
```

## 📚 Architecture Patterns

This implementation follows these premium patterns:

1. **Agent-First Design**: LangGraph agents as the core intelligence layer
2. **Protocol Standardization**: MCP SDK for tool exposure
3. **Workflow Abstraction**: n8n-style node system for business logic
4. **Type Safety**: Full TypeScript implementation
5. **Modular Architecture**: Clear separation of concerns
6. **Production Readiness**: Error handling, logging, and monitoring

## 📄 License

MIT
