// nodes/google/GoogleChatNode.ts - Google Chat workflow node

import { BaseNode } from '../BaseNode.js';
import type {
  NodeDefinition,
  NodeExecuteResult,
  WorkflowData,
} from '../../types/index.js';

export class GoogleChatNode extends BaseNode {
  getDefinition(): NodeDefinition {
    return {
      name: 'googleChat',
      displayName: 'Google Chat',
      description: 'Send text messages to Google Chat spaces',
      version: 1,
      defaults: {
        name: 'Google Chat Message',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          default: 'sendMessage',
          required: true,
          description: 'The operation to perform',
          options: [
            {
              name: 'Send Message',
              value: 'sendMessage',
            },
          ],
        },
        {
          displayName: 'Space ID',
          name: 'spaceId',
          type: 'string',
          required: true,
          description: 'Google Chat space ID (e.g., spaces/abc123)',
        },
        {
          displayName: 'Message Text',
          name: 'messageText',
          type: 'string',
          required: false,
          description:
            'Text message to send (required for sendMessage operation)',
        },
        {
          displayName: 'Thread ID',
          name: 'threadId',
          type: 'string',
          required: false,
          description: 'Optional thread ID for threaded conversations',
        },
      ],
      credentials: [
        {
          name: 'googleChatServiceAccount',
          displayName: 'Google Chat Service Account',
          properties: [
            {
              displayName: 'Service Account Path',
              name: 'serviceAccountPath',
              type: 'string',
              required: false,
              description:
                'Path to service account JSON file (defaults to ./service.json)',
            },
          ],
        },
      ],
    };
  }

  async execute(inputData: WorkflowData): Promise<NodeExecuteResult> {
    try {
      this.validateRequiredCredentials(['googleChatServiceAccount']);

      const operation = this.getParameter('operation', 'sendMessage');
      const spaceId = this.getParameter('spaceId');

      if (!spaceId) {
        throw new Error('Space ID is required');
      }

      // Import and use the GoogleChatAgent
      const { GoogleChatAgent } = await import(
        '../../agents/google/GoogleChatAgent.js'
      );
      const agent = new GoogleChatAgent();

      switch (operation) {
        case 'sendMessage':
          return await this.sendMessage(inputData, agent);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.createErrorResult(errorMessage);
    }
  }

  private async sendMessage(
    inputData: WorkflowData,
    agent: any
  ): Promise<NodeExecuteResult> {
    const spaceId = this.getParameter('spaceId');
    const messageText = this.getParameter('messageText');
    const threadId = this.getParameter('threadId');

    if (!messageText) {
      throw new Error('Message text is required for sendMessage operation');
    }

    console.log(`📤 Sending message to space: ${spaceId}`);
    console.log(`💬 Message: ${messageText}`);

    const result = await agent.sendMessageToSpace(
      spaceId,
      messageText,
      threadId
    );

    if (result.success) {
      return this.createSuccessResult({
        operation: 'sendMessage',
        success: true,
        messageId: result.messageId,
        spaceId: result.spaceId,
        messageText: messageText,
        threadId: threadId,
        ...inputData,
      });
    } else {
      return this.createErrorResult(result.error || 'Failed to send message');
    }
  }
}
