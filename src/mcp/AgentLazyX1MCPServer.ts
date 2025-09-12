// mcp/AgentLazyX1MCPServer.ts - Generic AgentLazyX1 MCP Server

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { JiraAgent } from '../agents/jira/JiraAgent.js';

export class AgentLazyX1MCPServer {
  private server!: Server;
  private jiraAgent: JiraAgent;

  constructor() {
    this.jiraAgent = new JiraAgent();
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
          const response = await this.jiraAgent.advancedSearch(searchOptions);

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

      throw new Error(`Unknown tool: ${name}`);
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('AgentLazyX1 MCP server running on stdio');
  }
}
