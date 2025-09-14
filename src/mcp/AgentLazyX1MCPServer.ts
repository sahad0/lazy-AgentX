// mcp/AgentLazyX1MCPServer.ts - Generic AgentLazyX1 MCP Server

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraAgent } from '../agents/jira/JiraAgent.js';
import { AndroidReleaseAgent } from '../agents/android/AndroidAgent.js';
import { GoogleDriveAgent } from '../agents/google/GoogleDriveAgent.js';
import { GoogleChatAgent } from '../agents/google/GoogleChatAgent.js';

export class AgentLazyX1MCPServer {
  private server!: Server;
  private jiraAgent: JiraAgent;
  private androidReleaseAgent: AndroidReleaseAgent;
  private googleDriveAgent: GoogleDriveAgent;
  private googleChatAgent: GoogleChatAgent;

  constructor() {
    this.jiraAgent = new JiraAgent();
    this.androidReleaseAgent = new AndroidReleaseAgent();
    this.googleDriveAgent = new GoogleDriveAgent();
    this.googleChatAgent = new GoogleChatAgent();
    this.initializeServer();
  }

  private initializeServer() {
    // Create MCP server with 2025 standards
    this.server = new Server(
      {
        name: 'agent-lazy-x1',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'jira_agent',
            description:
              'Jira agent powered by AgentLazyX1. Can fetch and summarize Jira tickets, answer questions about tickets, and provide intelligent responses about your Jira data using n8n-style workflow engine.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'Your question or request about Jira tickets. Can include ticket URLs, keys, or general questions.',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'jira_advanced_search',
            description:
              'Advanced Jira search with filters for assignee, status, priority, issue type, project, and text search.',
            inputSchema: {
              type: 'object',
              properties: {
                text: {
                  type: 'string',
                  description:
                    'Text to search for in ticket summary, description, or comments',
                },
                assignee: {
                  type: 'string',
                  description:
                    'Filter by assignee (username, email, or "unassigned")',
                },
                status: {
                  type: 'string',
                  description:
                    'Filter by status (e.g., "To Do", "In Progress", "Done")',
                },
                priority: {
                  type: 'string',
                  description:
                    'Filter by priority (e.g., "High", "Medium", "Low")',
                },
                issueType: {
                  type: 'string',
                  description:
                    'Filter by issue type (e.g., "Bug", "Task", "Story")',
                },
                project: {
                  type: 'string',
                  description: 'Filter by project key (e.g., "SCRUM", "PROJ")',
                },
                maxResults: {
                  type: 'number',
                  description:
                    'Maximum number of results to return (default: 10)',
                },
              },
            },
          },
          {
            name: 'android_release_agent',
            description:
              'Android release agent for executing build commands and yarn scripts. Runs terminal commands for Android development workflows with extended timeout for low-end devices. IMPORTANT: Set runGradleClean parameter to control clean step.',
            inputSchema: {
              type: 'object',
              properties: {
                command: {
                  type: 'string',
                  description:
                    'The command to execute (e.g., "yarn build", "yarn android:release"). Use "android:release" for full Android release build workflow.',
                },
                projectPath: {
                  type: 'string',
                  description:
                    'Optional project path (defaults to current directory)',
                },
                runGradleClean: {
                  type: 'string',
                  enum: ['yes', 'no', 'auto'],
                  description:
                    'Gradle clean control: "yes" = run gradlew clean (additional cache clearing), "no" = skip gradlew clean (default, faster), "auto" = default behavior (skips gradlew clean). Build folder deletion always happens.',
                },
              },
              required: ['command'],
            },
          },
          {
            name: 'google_drive_upload',
            description:
              'Upload files to Google Drive with real-time progress tracking. Supports both small and large files with automatic optimization. Returns public sharing URLs for immediate access.',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Local file path to upload to Google Drive',
                },
                folderId: {
                  type: 'string',
                  description:
                    'Google Drive folder ID to upload to (optional, uses GOOGLE_DRIVE_FOLDER_ID env var if not specified)',
                },
                fileName: {
                  type: 'string',
                  description:
                    'Custom name for the file in Google Drive (optional, defaults to original filename)',
                },
                enableProgress: {
                  type: 'boolean',
                  description:
                    'Enable progress tracking for large file uploads (default: true)',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'google_chat_agent',
            description:
              'Google Chat agent powered by AgentLazyX1. Can send text messages to Google Chat spaces using modern Google Chat API. Supports natural language input, user mentions, URL attachments, and @all mentions.',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description:
                    'Your request for Google Chat operations. Supports natural language: "send [message] to [user]" or "Send message \'Hello World\' to space spaces/abc123". Can include URLs, user mentions, and @all tags.',
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    // Handle tool calls using agents
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (name === 'jira_agent') {
        const { query } = args as { query: string };

        try {
          const response = await this.jiraAgent.processQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `Error processing request: ${errorMessage}`,
              },
            ],
          };
        }
      }

      if (name === 'jira_advanced_search') {
        const searchOptions = args as {
          text?: string;
          assignee?: string;
          status?: string;
          priority?: string;
          issueType?: string;
          project?: string;
          maxResults?: number;
        };

        try {
          // Convert search options to a query string
          const queryParts = [];
          if (searchOptions.text) queryParts.push(searchOptions.text);
          if (searchOptions.assignee)
            queryParts.push(`assigned to ${searchOptions.assignee}`);
          if (searchOptions.status) queryParts.push(searchOptions.status);
          if (searchOptions.priority) queryParts.push(searchOptions.priority);
          if (searchOptions.issueType) queryParts.push(searchOptions.issueType);

          const query = queryParts.join(' ');
          const response = await this.jiraAgent.processQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `Error processing advanced search: ${errorMessage}`,
              },
            ],
          };
        }
      }

      if (name === 'android_release_agent') {
        const { command, projectPath, runGradleClean } = args as {
          command: string;
          projectPath?: string;
          runGradleClean?: 'yes' | 'no' | 'auto';
        };

        try {
          console.log(
            `🚀 Starting Android release agent with command: ${command}`
          );
          console.log(`📁 Project path: ${projectPath || 'current directory'}`);
          const cleanOption = runGradleClean || 'auto';
          console.log(`🧹 Gradle clean option: ${cleanOption}`);

          // Provide guidance to user about their choice
          if (cleanOption === 'auto') {
            console.log(
              `ℹ️ Using default behavior - Skipping gradlew clean (build folder deletion provides clean build)`
            );
            console.log(
              `💡 Tip: Use runGradleClean: "yes" for additional gradlew clean cache clearing`
            );
          } else if (cleanOption === 'yes') {
            console.log(
              `✅ User chose to run gradlew clean (additional cache clearing)`
            );
          } else if (cleanOption === 'no') {
            console.log(`⏭️ User chose to skip gradlew clean (faster build)`);
            console.log(
              `ℹ️ Build folder deletion still provides clean build artifacts`
            );
          }

          let response: string;

          // Check if this is the special Android release build command
          if (command === 'android:release') {
            console.log(`📱 Detected Android release build command`);
            // Convert runGradleClean to boolean for the agent
            // Default behavior (auto) now skips gradlew clean, only run when explicitly "yes"
            const skipClean = runGradleClean !== 'yes';
            response = await this.androidReleaseAgent.buildAndroidRelease(
              projectPath,
              skipClean
            );
          } else {
            response = await this.androidReleaseAgent.processCommand(
              command,
              projectPath
            );
          }

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `Error processing Android command: ${errorMessage}`,
              },
            ],
          };
        }
      }

      if (name === 'google_drive_upload') {
        const { filePath, folderId, fileName, enableProgress } = args as {
          filePath: string;
          folderId?: string;
          fileName?: string;
          enableProgress?: boolean;
        };

        try {
          const response = await this.googleDriveAgent.uploadFile(
            filePath,
            folderId,
            fileName,
            enableProgress
              ? (progress) => {
                  const speedMB =
                    Math.round((progress.speed / 1024 / 1024) * 100) / 100;
                  const etaMinutes =
                    Math.round((progress.eta / 60) * 100) / 100;
                  console.log(
                    `📊 Upload progress: ${progress.percentage.toFixed(1)}% - ${speedMB}MB/s - ETA: ${etaMinutes}m`
                  );
                }
              : undefined
          );

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `Error uploading file to Google Drive: ${errorMessage}`,
              },
            ],
          };
        }
      }

      if (name === 'google_chat_agent') {
        const { query } = args as { query: string };

        try {
          const response = await this.googleChatAgent.processQuery(query);

          return {
            content: [
              {
                type: 'text',
                text: response,
              },
            ],
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [
              {
                type: 'text',
                text: `Error with Google Chat agent: ${errorMessage}`,
              },
            ],
          };
        }
      }

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AgentLazyX1 MCP server running on stdio');

    // Simple health check
    this.setupHealthCheck();
  }

  private setupHealthCheck() {
    // Basic health monitoring
    const startTime = Date.now();
    const healthCheck = () => {
      const uptime = Date.now() - startTime;
      if (process.env.NODE_ENV === 'production') {
        console.error(
          `Health check: Server running for ${Math.floor(uptime / 1000)}s`
        );
      }
    };

    // Health check every 5 minutes in production
    if (process.env.NODE_ENV === 'production') {
      setInterval(healthCheck, 5 * 60 * 1000);
    }
  }
}
