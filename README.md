# AgentLazyX1 - Multi-Agent MCP Server

A production-ready Model Context Protocol (MCP) server that provides intelligent automation through specialized agents: Jira, Android Release, and Google Drive integration with LangGraph agents and n8n-style workflow engine.

## 🏗️ Premium Architecture

This project implements enterprise-grade patterns following LangGraph and MCP SDK best practices:

```
src/
├── agents/          # LangGraph agents (core intelligence)
│   ├── jira/        # Jira integration agent
│   │   └── JiraAgent.ts
│   ├── android/     # Android release automation agent
│   │   └── AndroidAgent.ts
│   └── google/      # Google Drive integration agent
│       └── GoogleDriveAgent.ts
├── mcp/             # MCP server implementation
│   └── AgentLazyX1MCPServer.ts # Exposes all agents as MCP tools
├── nodes/           # Workflow node implementations
│   ├── BaseNode.ts  # Base class for all nodes
│   ├── jira/        # Jira-specific nodes
│   │   └── JiraNode.ts
│   ├── android/     # Android-specific nodes
│   │   └── AndroidNode.ts
│   └── google/      # Google Drive-specific nodes
│       └── GoogleDriveNode.ts
├── engine/          # Workflow execution engine
│   └── WorkflowEngine.ts
├── workflows/       # Predefined workflow definitions
│   ├── jira/        # Jira workflows
│   │   └── jira-workflow.ts
│   ├── android/     # Android workflows
│   │   └── android-workflow.ts
│   └── google/      # Google Drive workflows
│       └── google-drive-workflow.ts
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
- **Multi-Agent Support**: Jira, Android Release, and Google Drive agents
- **Large File Handling**: Streaming uploads for files 100MB+ with progress tracking
- **Service Account Authentication**: Secure Google Drive integration with service accounts
- **Build Automation**: Complete Android release pipeline with intelligent error handling

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

# Jira Configuration
export JIRA_DOMAIN="https://your-domain.atlassian.net"
export JIRA_EMAIL="your-email@company.com"
export JIRA_API_TOKEN="your-jira-api-token"

# Google Drive Configuration (Service Account)
export GOOGLE_SERVICE_ACCOUNT_PATH="./drive-agent-service.json"
export GOOGLE_DRIVE_FOLDER_ID="your-shared-drive-folder-id"

# Google Chat Configuration (Optional - for default space)
export GCHAT_SPACE_ID="spaces/your-google-chat-space-id"
```

### Google Drive Setup

For Google Drive integration, you need to set up a service account:

1. **Create Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google Drive API
   - Create a service account
   - Download the JSON key file as `drive-agent-service.json`

2. **Configure Shared Drive**:
   - Create a Google Shared Drive (required for service accounts)
   - Share the folder with your service account email
   - Give Editor permissions to the service account
   - Copy the folder ID from the URL

3. **Environment Variables**:
   ```bash
   export GOOGLE_SERVICE_ACCOUNT_PATH="./drive-agent-service.json"
   export GOOGLE_DRIVE_FOLDER_ID="0ACgT3D-lOrnbUk9PVA"  # Your shared drive folder ID
   ```

See `GOOGLE_DRIVE_SETUP.md` for detailed setup instructions.

### Google Chat Setup

For Google Chat integration, you need to set up a service account and configure the space:

1. **Service Account Setup** (same as Google Drive):
   - Use the same service account JSON file (service.json) as Google Drive
   - Ensure the service account has Google Chat API access

2. **Add Bot to Google Chat Space**:
   - Open your Google Chat space
   - Click on the space name → "Manage webhooks and apps"
   - Add the service account email as a bot
   - Give it appropriate permissions

3. **Get Space ID**:
   - Open the Google Chat space in your browser
   - Copy the space ID from the URL: `https://chat.google.com/room/XXXXXXXXX`
   - The space ID format is: `spaces/XXXXXXXXX`

4. **Environment Variables**:

   ```bash
   export GCHAT_SPACE_ID="spaces/your-google-chat-space-id"
   ```

5. **Usage**:
   - With default space: `Send message 'Hello World'`
   - With specific space: `Send message 'Hello World' to space spaces/abc123`

### Running the System

```bash
# Development mode with hot reload
yarn dev

# Production MCP server
yarn mcp

# Production build and start
yarn build
yarn start:prod

# LangGraph API server (alternative deployment)
yarn langgraph:start

# Development LangGraph server
yarn langgraph:dev
```

### Production Deployment

1. **Environment Setup**:

   ```bash
   cp env.example .env
   # Edit .env with your production values
   export NODE_ENV=production
   ```

2. **Build and Deploy**:

   ```bash
   yarn build
   yarn start:prod
   ```

3. **Health Monitoring**:
   - Health checks run every 5 minutes in production
   - Monitor logs for uptime and error messages
   - All agents include basic error handling and logging

### Cursor Integration

The MCP server exposes multiple specialized tools:

## 🤖 Available Agents & APIs

### 1. Jira Agent

**Tools**: `jira_agent`, `jira_advanced_search`

**Capabilities**:

- **Intelligent Jira Queries**: Natural language processing of Jira requests
- **Workflow Execution**: n8n-style workflow processing
- **AI-Enhanced Responses**: Context-aware ticket summaries
- **Multi-format Support**: Handles ticket keys, URLs, and descriptions
- **Advanced Search**: Filter by assignee, status, priority, issue type, project

**API Parameters**:

```typescript
// jira_agent
{ query: string }

// jira_advanced_search
{
  text?: string,           // Search text
  assignee?: string,       // Filter by assignee
  status?: string,         // Filter by status
  priority?: string,       // Filter by priority
  issueType?: string,      // Filter by issue type
  project?: string,        // Filter by project
  maxResults?: number      // Max results (default: 10)
}
```

### 2. Android Release Agent

**Tool**: `android_release_agent`

**Capabilities**:

- **Build Automation**: Automated Android release builds
- **Error Analysis**: Intelligent error detection with solutions
- **Progress Tracking**: Real-time build progress monitoring
- **Clean Build Management**: Smart cache clearing and build folder management
- **Extended Timeout**: Optimized for low-end devices

**API Parameters**:

```typescript
{
  command: string,                    // Required: Command to execute
  projectPath?: string,               // Optional: Project path
  runGradleClean?: 'yes'|'no'|'auto' // Gradle clean control
}
```

**Special Commands**:

- `android:release` - Full Android release build workflow
- `yarn build` - Standard build command
- `yarn android:release` - Android-specific release

### 3. Google Chat Agent

**Tool**: `google_chat_agent`

**Capabilities**:

- **Text Messaging**: Send messages to Google Chat spaces
- **User Mentions**: Tag specific users by name or email
- **URL Attachments**: Include links with custom display text
- **Default Space**: Configure a default space for easy messaging
- **Enhanced Features**: Support for @all mentions and thread replies

**API Parameters**:

```typescript
{
  query: string; // Natural language query for sending messages
}
```

**Query Examples**:

```typescript
// Simple message to default space
"Send message 'Hello World'";

// Message to specific space
"Send message 'Hello World' to space spaces/abc123";

// Message with user mentions
"Send message 'Hello team' tag users 'john, jane'";

// Message with URL
"Send message 'Check this out' url 'https://example.com' url text 'Example Link'";

// Message with @all mention
"Send message 'Important update' tag all";
```

### 4. Google Drive Agent

**Tool**: `google_drive_upload`

**Capabilities**:

- **Large File Uploads**: Streaming uploads for files 100MB+ with resumable upload
- **Progress Tracking**: Real-time upload progress with speed and ETA
- **Memory Efficient**: Uses streaming to avoid loading entire files into memory
- **Service Account Auth**: Secure authentication with Google service accounts
- **Public Sharing**: Automatic public sharing permissions
- **File Replacement**: Smart handling of existing files

**API Parameters**:

```typescript
{
  filePath: string,        // Required: Local file path
  folderId?: string,       // Optional: Google Drive folder ID
  fileName?: string,       // Optional: Custom file name
  enableProgress?: boolean // Optional: Enable progress tracking
}
```

**Features**:

- **Automatic Optimization**: Chooses simple vs resumable upload based on file size
- **Progress Tracking**: Real-time upload progress with speed and ETA
- **Public URLs**: Returns both direct and sharing links
- **Error Handling**: Comprehensive error messages with solutions

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
- **Google Drive List/Download**: File listing and download capabilities
- **Android Build Variants**: Support for different build flavors and variants
- **Jira Webhook Integration**: Real-time ticket updates and notifications

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
