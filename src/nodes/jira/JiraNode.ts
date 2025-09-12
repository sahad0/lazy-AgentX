// nodes/JiraNode.ts - Jira workflow node

import { BaseNode } from '../BaseNode.js';
import type {
  NodeDefinition,
  NodeExecuteResult,
  WorkflowData,
} from '../../types/index.js';

export class JiraNode extends BaseNode {
  getDefinition(): NodeDefinition {
    return {
      name: 'jira',
      displayName: 'Jira',
      description: 'Fetch and process Jira tickets',
      version: 1,
      defaults: {
        name: 'Jira',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          default: 'getTicket',
          required: true,
          description: 'The operation to perform',
          options: [
            {
              name: 'Get Ticket',
              value: 'getTicket',
            },
            {
              name: 'Search Tickets',
              value: 'searchTickets',
            },
          ],
        },
        {
          displayName: 'Ticket Key',
          name: 'ticketKey',
          type: 'string',
          required: true,
          description: 'The Jira ticket key (e.g., PROJ-123) or full Jira URL',
        },
        {
          displayName: 'Include Description',
          name: 'includeDescription',
          type: 'boolean',
          default: true,
          description: 'Whether to include the full ticket description',
        },
        {
          displayName: 'Max Description Length',
          name: 'maxDescriptionLength',
          type: 'number',
          default: 200,
          description: 'Maximum length of description to include',
        },
      ],
      credentials: [
        {
          name: 'jiraApi',
          displayName: 'Jira API',
          properties: [
            {
              displayName: 'Domain',
              name: 'domain',
              type: 'string',
              required: true,
              description:
                'Your Jira domain (e.g., https://company.atlassian.net)',
            },
            {
              displayName: 'Email',
              name: 'email',
              type: 'string',
              required: true,
              description: 'Your Jira email address',
            },
            {
              displayName: 'API Token',
              name: 'apiToken',
              type: 'string',
              required: true,
              description: 'Your Jira API token',
            },
          ],
        },
      ],
    };
  }

  async execute(inputData: WorkflowData): Promise<NodeExecuteResult> {
    try {
      this.validateRequiredCredentials(['jiraApi']);

      const operation = this.getParameter('operation', 'getTicket');

      switch (operation) {
        case 'getTicket':
          return await this.getTicket(inputData);
        case 'searchTickets':
          return await this.searchTickets(inputData);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.createErrorResult(errorMessage);
    }
  }

  private async getTicket(inputData: WorkflowData): Promise<NodeExecuteResult> {
    const ticketKey = this.getParameter('ticketKey');
    const includeDescription = this.getParameter('includeDescription', true);
    const maxDescriptionLength = this.getParameter('maxDescriptionLength', 200);

    if (!ticketKey) {
      throw new Error('Ticket key is required');
    }

    // Extract ticket key from URL if provided
    let key = ticketKey;
    if (ticketKey.includes('atlassian.net') || ticketKey.includes('jira')) {
      const match = ticketKey.match(/([A-Z]+-\d+)/);
      if (match) {
        key = match[1];
      }
    }

    const credentials = this.getCredential('jiraApi');
    const url = `${credentials.domain}/rest/api/3/issue/${key}`;
    const auth = Buffer.from(
      `${credentials.email}:${credentials.apiToken}`
    ).toString('base64');

    const response = await fetch(url, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          `Authentication failed for Jira. Please check your credentials. Status: ${response.status}`
        );
      } else if (response.status === 403) {
        throw new Error(
          `Access forbidden. Please verify your Jira API token has the necessary permissions. Status: ${response.status}`
        );
      } else if (response.status === 404) {
        throw new Error(
          `Ticket ${key} not found. Please verify the ticket key is correct. Status: ${response.status}`
        );
      } else {
        throw new Error(
          `Error fetching ticket ${key}: ${response.status} ${response.statusText}`
        );
      }
    }

    const ticketData = await response.json();
    const { key: ticketKeyResult, fields } = ticketData;

    const summary = fields.summary || 'No summary available';
    const status = fields.status?.name || 'Unknown status';
    const assignee = fields.assignee?.displayName || 'Unassigned';
    const priority = fields.priority?.name || 'No priority set';
    const issueType = fields.issuetype?.name || 'Unknown type';

    let description = 'No description available';
    if (
      includeDescription &&
      fields.description?.content?.[0]?.content?.[0]?.text
    ) {
      const fullDescription = fields.description.content[0].content[0].text;
      description =
        fullDescription.length > maxDescriptionLength
          ? fullDescription.substring(0, maxDescriptionLength) + '...'
          : fullDescription;
    }

    const result = {
      ticket: {
        key: ticketKeyResult,
        summary,
        status,
        type: issueType,
        priority,
        assignee,
        description,
        url: `${credentials.domain}/browse/${ticketKeyResult}`,
        raw: ticketData, // Include raw data for advanced processing
      },
      ...inputData, // Pass through input data
    };

    return this.createSuccessResult(result);
  }

  private async searchTickets(
    inputData: WorkflowData
  ): Promise<NodeExecuteResult> {
    const searchQuery = this.getParameter('searchQuery');
    const maxResults = this.getParameter('maxResults', 10);

    if (!searchQuery) {
      throw new Error('Search query is required');
    }

    const credentials = this.getCredential('jiraApi');
    const url = `${credentials.domain}/rest/api/3/search`;
    const auth = Buffer.from(
      `${credentials.email}:${credentials.apiToken}`
    ).toString('base64');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jql: searchQuery,
        maxResults: maxResults,
        fields: [
          'key',
          'summary',
          'status',
          'assignee',
          'priority',
          'issuetype',
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Error searching tickets: ${response.status} ${response.statusText}`
      );
    }

    const searchData = await response.json();
    const tickets = searchData.issues.map((issue: any) => ({
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name,
      assignee: issue.fields.assignee?.displayName || 'Unassigned',
      priority: issue.fields.priority?.name,
      type: issue.fields.issuetype?.name,
      url: `${credentials.domain}/browse/${issue.key}`,
    }));

    return this.createSuccessResult({
      tickets,
      total: searchData.total,
      query: searchQuery,
      ...inputData,
    });
  }
}
