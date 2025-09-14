import type { WorkflowDefinition } from '../../types/index.js';

export const createGoogleChatMessageWorkflow = (
  spaceId: string,
  messageText: string,
  threadId?: string
): WorkflowDefinition => {
  return {
    id: 'google-chat-message-workflow',
    name: 'Send Message to Google Chat Space',
    active: true,
    settings: {},
    nodes: [
      {
        id: 'google-chat-node-1',
        type: 'googleChat',
        name: 'Send Chat Message',
        position: { x: 100, y: 100 },
        parameters: {
          operation: 'sendMessage',
          spaceId: spaceId,
          messageText: messageText,
          threadId: threadId,
        },
        credentials: {
          googleChatServiceAccount: {
            serviceAccountPath:
              process.env.GOOGLE_CHAT_SERVICE_ACCOUNT_PATH ||
              './drive-agent-service.json',
          },
        },
      },
    ],
    connections: {
      'google-chat-node-1': [], // No outgoing connections - end node
    },
  };
};

// Workflow for sending multiple messages
export const createGoogleChatBatchMessageWorkflow = (
  messages: Array<{
    spaceId: string;
    messageText: string;
    threadId?: string;
  }>
): WorkflowDefinition => {
  const nodes = messages.map((message, index) => ({
    id: `google-chat-message-node-${index}`,
    type: 'googleChat',
    name: `Send Message ${index + 1}`,
    position: { x: 100, y: 100 + index * 150 },
    parameters: {
      operation: 'sendMessage',
      spaceId: message.spaceId,
      messageText: message.messageText,
      threadId: message.threadId,
    },
    credentials: {
      googleChatServiceAccount: {
        serviceAccountPath:
          process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service.json',
      },
    },
  }));

  const connections: Record<string, any[]> = {};
  nodes.forEach((node, index) => {
    connections[node.id] = [];
  });

  return {
    id: 'google-chat-batch-message-workflow',
    name: 'Batch Send Messages to Google Chat',
    active: true,
    settings: {
      batchSize: messages.length,
      parallelMessages: true,
    },
    nodes,
    connections,
  };
};

// Workflow for sending threaded messages
export const createGoogleChatThreadedMessageWorkflow = (
  spaceId: string,
  threadId: string,
  messages: string[]
): WorkflowDefinition => {
  const nodes = messages.map((message, index) => ({
    id: `google-chat-threaded-node-${index}`,
    type: 'googleChat',
    name: `Threaded Message ${index + 1}`,
    position: { x: 100, y: 100 + index * 150 },
    parameters: {
      operation: 'sendMessage',
      spaceId: spaceId,
      messageText: message,
      threadId: threadId,
    },
    credentials: {
      googleChatServiceAccount: {
        serviceAccountPath:
          process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service.json',
      },
    },
  }));

  const connections: Record<string, any[]> = {};
  nodes.forEach((node, index) => {
    connections[node.id] = [];
  });

  return {
    id: 'google-chat-threaded-message-workflow',
    name: 'Send Threaded Messages to Google Chat',
    active: true,
    settings: {
      threadId: threadId,
      messageCount: messages.length,
    },
    nodes,
    connections,
  };
};
