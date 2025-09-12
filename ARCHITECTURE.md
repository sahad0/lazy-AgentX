# AgentLazyX1 Architecture Diagram

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CURSOR IDE                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MCP Client                                 │   │
│  │  • Sends tool requests                                  │   │
│  │  • Receives responses                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ MCP Protocol
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    agent-lazy-x1.mts                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Main Entry Point                           │   │
│  │  • Starts MCP Server                                   │   │
│  │  • Handles process lifecycle                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ imports
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              AgentLazyX1MCPServer.ts                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MCP Server                                 │   │
│  │  • ListToolsRequestSchema                              │   │
│  │  • CallToolRequestSchema                               │   │
│  │  • Routes requests to agents                           │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ delegates to
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JiraAgent.ts                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              LangGraph Agent                            │   │
│  │  • processQuery() method                               │   │
│  │  • Extracts ticket keys                                │   │
│  │  • Orchestrates workflows                              │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ uses
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  WorkflowEngine.ts                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Workflow Orchestrator                      │   │
│  │  • Node Registry (Map<string, NodeConstructor>)        │   │
│  │  • executeWorkflow() method                            │   │
│  │  • Manages node execution flow                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ executes
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JiraNode.ts                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Workflow Node                              │   │
│  │  • Extends BaseNode                                    │   │
│  │  • Makes Jira API calls                                │   │
│  │  • Returns structured data                             │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ extends
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     BaseNode.ts                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Abstract Base Class                        │   │
│  │  • getParameter() helper                               │   │
│  │  • createSuccessResult() helper                        │   │
│  │  • validateRequiredParameters() helper                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ uses
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    types/index.ts                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Type Definitions                           │   │
│  │  • WorkflowNode interface                              │   │
│  │  • WorkflowExecution interface                         │   │
│  │  • NodeExecuteResult interface                         │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

```
1. User Query in Cursor
   ↓
2. MCP Client sends request
   ↓
3. AgentLazyX1MCPServer receives
   ↓
4. Routes to JiraAgent.processQuery()
   ↓
5. Creates JiraWorkflow
   ↓
6. WorkflowEngine.executeWorkflow()
   ↓
7. JiraNode.execute() - API calls
   ↓
8. Response flows back through chain
   ↓
9. Formatted response to Cursor
```

## 🎯 Component Responsibilities

### **Entry Layer**

- **agent-lazy-x1.mts**: Process startup and error handling

### **Protocol Layer**

- **AgentLazyX1MCPServer.ts**: MCP protocol implementation

### **Agent Layer**

- **JiraAgent.ts**: High-level business logic

### **Engine Layer**

- **WorkflowEngine.ts**: Workflow orchestration

### **Node Layer**

- **BaseNode.ts**: Common node functionality
- **JiraNode.ts**: Specific Jira implementation

### **Type Layer**

- **types/index.ts**: Shared type definitions

## 🚀 Extensibility Points

```
src/agents/
├── jira/JiraAgent.ts        # ✅ Current
├── slack/SlackAgent.ts      # 🔮 Future
└── github/GitHubAgent.ts    # 🔮 Future

src/nodes/
├── BaseNode.ts              # ✅ Common base
├── jira/JiraNode.ts         # ✅ Current
├── slack/SlackNode.ts       # 🔮 Future
└── github/GitHubNode.ts     # 🔮 Future
```

## 🔧 Configuration Files

- **package.json**: Dependencies and scripts
- **tsconfig.json**: TypeScript compilation
- **langgraph.json**: LangGraph deployment config
- **env.example**: Environment variables template
