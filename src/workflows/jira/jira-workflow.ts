// workflows/jira-workflow.ts - Jira workflow definition

import type { WorkflowDefinition } from '../../types/index.js';

export const createJiraWorkflow = (ticketKey: string): WorkflowDefinition => {
  return {
    id: 'jira-fetch-workflow',
    name: 'Fetch Jira Ticket',
    active: true,
    settings: {},
    nodes: [
      {
        id: 'jira-node-1',
        type: 'jira',
        name: 'Fetch Jira Ticket',
        position: { x: 100, y: 100 },
        parameters: {
          operation: 'getTicket',
          ticketKey: ticketKey,
          includeDescription: true,
          maxDescriptionLength: 200,
        },
        credentials: {
          jiraApi: {
            domain: process.env.JIRA_DOMAIN,
            email: process.env.JIRA_EMAIL,
            apiToken: process.env.JIRA_API_TOKEN,
          },
        },
      },
    ],
    connections: {
      'jira-node-1': [], // No outgoing connections - end node
    },
  };
};
