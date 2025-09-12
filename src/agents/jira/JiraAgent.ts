// agents/JiraAgent.ts - Simple LangGraph-compatible agent

import { WorkflowEngine } from '../../engine/WorkflowEngine.js';
import { createJiraWorkflow } from '../../workflows/jira/jira-workflow.js';

// Simple state interface for LangGraph compatibility
interface JiraState {
  query: string;
  ticketKey?: string;
  result?: string;
  status?: 'success' | 'error';
  error?: string;
}

export class JiraAgent {
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  async processQuery(query: string, ticketKey?: string): Promise<string> {
    try {
      // Check if query contains a ticket key
      const extractedTicketKey = ticketKey || this.extractTicketKey(query);

      if (extractedTicketKey) {
        // Single ticket fetch
        return await this.fetchSingleTicket(extractedTicketKey);
      } else {
        // Unified search with partial keyword matching
        return await this.unifiedSearch(query);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error processing Jira query: ${errorMessage}`;
    }
  }

  private async fetchSingleTicket(ticketKey: string): Promise<string> {
    try {
      // Create and execute single ticket workflow
      const workflow = createJiraWorkflow(ticketKey);
      const execution = await this.workflowEngine.executeWorkflow(workflow, {});

      if (execution.status === 'error') {
        return `Error executing Jira workflow: ${execution.error}`;
      }

      // Extract ticket data from workflow result
      const ticket = (execution.data as any).ticket;
      return `**Jira Ticket Summary**
              **Ticket:** ${ticket.key}
              **Title:** ${ticket.summary}
              **Status:** ${ticket.status}
              **Type:** ${ticket.type}
              **Priority:** ${ticket.priority}
              **Assignee:** ${ticket.assignee}
              **Description:** ${ticket.description}
              **Jira Link:** ${ticket.url}`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error fetching ticket: ${errorMessage}`;
    }
  }

  // Simple unified search with partial keyword matching
  async unifiedSearch(query: string): Promise<string> {
    try {
      // Parse query for different search criteria with partial matching
      const searchCriteria = this.parseSearchQuery(query);

      // Get all tickets and filter with partial matching
      const allTickets = await this.getAllTickets();

      if (allTickets.length === 0) {
        return `No Jira tickets found matching: ${query}`;
      }

      // Filter tickets based on criteria with partial matching
      const filteredTickets = this.filterTicketsWithPartialMatch(
        allTickets,
        searchCriteria
      );

      if (filteredTickets.length === 0) {
        return `No Jira tickets found matching criteria: ${query}`;
      }

      return this.formatSearchResults(filteredTickets, query);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error in unified search: ${errorMessage}`;
    }
  }

  private parseSearchQuery(query: string): {
    text?: string;
    assignee?: string;
    status?: string;
    priority?: string;
    issueType?: string;
  } {
    const lowerQuery = query.toLowerCase();
    const criteria: any = {};

    // Extract assignee patterns
    const assigneePatterns = [
      /assigned to\s+([\w\s.-]+)/i,
      /assignee\s+([\w\s.-]+)/i,
      /for user\s+([\w\s.-]+)/i,
      /user:\s*([\w\s.-]+)/i,
    ];

    for (const pattern of assigneePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        criteria.assignee = match[1].trim();
        break;
      }
    }

    // Extract status patterns
    const statusKeywords = [
      'todo',
      'in progress',
      'done',
      'blocked',
      'closed',
      'open',
    ];
    for (const status of statusKeywords) {
      if (lowerQuery.includes(status)) {
        criteria.status = status;
        break;
      }
    }

    // Extract priority patterns
    const priorityKeywords = ['high', 'medium', 'low', 'critical', 'urgent'];
    for (const priority of priorityKeywords) {
      if (lowerQuery.includes(priority)) {
        criteria.priority = priority;
        break;
      }
    }

    // Extract issue type patterns
    const issueTypeKeywords = ['bug', 'task', 'story', 'epic', 'subtask'];
    for (const type of issueTypeKeywords) {
      if (lowerQuery.includes(type)) {
        criteria.issueType = type;
        break;
      }
    }

    // If no specific patterns found, use the whole query as text search
    if (Object.keys(criteria).length === 0) {
      criteria.text = query;
    }

    return criteria;
  }

  private async getAllTickets(): Promise<any[]> {
    try {
      // Direct API call to get all tickets
      const credentials = {
        domain: process.env.JIRA_DOMAIN,
        email: process.env.JIRA_EMAIL,
        apiToken: process.env.JIRA_API_TOKEN,
      };

      if (!credentials.domain || !credentials.email || !credentials.apiToken) {
        throw new Error('Jira credentials not configured');
      }

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
          jql: 'ORDER BY updated DESC',
          maxResults: 100,
          fields: [
            'key',
            'summary',
            'status',
            'assignee',
            'priority',
            'issuetype',
            'description',
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Error fetching tickets: ${response.status} ${response.statusText}`
        );
      }

      const searchData = await response.json();
      return searchData.issues.map((issue: any) => ({
        key: issue.key,
        summary: issue.fields.summary,
        status: issue.fields.status?.name || 'Unknown',
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        priority: issue.fields.priority?.name || 'No priority',
        type: issue.fields.issuetype?.name || 'Unknown',
        description: this.extractDescription(issue.fields.description),
        url: `${credentials.domain}/browse/${issue.key}`,
      }));
    } catch (error) {
      console.error('Error getting all tickets:', error);
      return [];
    }
  }

  private extractDescription(description: any): string {
    if (!description?.content?.[0]?.content?.[0]?.text) {
      return '';
    }
    return description.content[0].content[0].text;
  }

  private filterTicketsWithPartialMatch(tickets: any[], criteria: any): any[] {
    return tickets.filter((ticket: any) => {
      // Text search (case-insensitive partial match)
      if (criteria.text) {
        const searchText = criteria.text.toLowerCase();
        const ticketText =
          `${ticket.summary} ${ticket.description || ''}`.toLowerCase();
        if (!ticketText.includes(searchText)) {
          return false;
        }
      }

      // Assignee search (case-insensitive partial match)
      if (criteria.assignee) {
        const searchAssignee = criteria.assignee.toLowerCase();
        const ticketAssignee = (ticket.assignee || 'unassigned').toLowerCase();
        if (!ticketAssignee.includes(searchAssignee)) {
          return false;
        }
      }

      // Status search (case-insensitive partial match)
      if (criteria.status) {
        const searchStatus = criteria.status.toLowerCase();
        const ticketStatus = (ticket.status || '').toLowerCase();
        if (!ticketStatus.includes(searchStatus)) {
          return false;
        }
      }

      // Priority search (case-insensitive partial match)
      if (criteria.priority) {
        const searchPriority = criteria.priority.toLowerCase();
        const ticketPriority = (ticket.priority || '').toLowerCase();
        if (!ticketPriority.includes(searchPriority)) {
          return false;
        }
      }

      // Issue type search (case-insensitive partial match)
      if (criteria.issueType) {
        const searchType = criteria.issueType.toLowerCase();
        const ticketType = (ticket.type || '').toLowerCase();
        if (!ticketType.includes(searchType)) {
          return false;
        }
      }

      return true;
    });
  }

  private formatSearchResults(tickets: any[], query: string): string {
    let response = `**Search Results for: "${query}"**

**Found ${tickets.length} tickets:**

`;

    tickets.slice(0, 20).forEach((ticket: any, index: number) => {
      response += `${index + 1}. **${ticket.key}** - ${ticket.summary}
   Status: ${ticket.status} | Type: ${ticket.type} | Priority: ${ticket.priority}
   Assignee: ${ticket.assignee}
   Link: ${ticket.url}

`;
    });

    if (tickets.length > 20) {
      response += `... and ${tickets.length - 20} more tickets.`;
    }

    return response;
  }

  getAvailableNodes(): string[] {
    return this.workflowEngine.getAvailableNodes();
  }

  private extractTicketKey(input: string): string | null {
    // Try to extract ticket key from various formats
    const patterns = [
      /([A-Z]+-\d+)/, // Standard ticket key like PROJ-123
      /atlassian\.net.*?([A-Z]+-\d+)/, // Jira URL
      /jira.*?([A-Z]+-\d+)/, // Jira URL variant
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
}

// Export a default instance for LangGraph deployment
export const jiraAgent = new JiraAgent();

// Simple graph function for LangGraph compatibility
export async function graph(state: JiraState): Promise<JiraState> {
  const result = await jiraAgent.processQuery(state.query, state.ticketKey);

  return {
    ...state,
    result,
    status: 'success',
  };
}
