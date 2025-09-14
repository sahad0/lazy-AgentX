// agents/google/GoogleChatAgent.ts - Google Chat Agent for sending text messages to spaces

import { google } from 'googleapis';
import * as fs from 'fs';

interface ChatMessage {
  text: string;
  spaceId?: string;
  threadId?: string;
  url?: string;
  urlText?: string;
  tagAll?: boolean;
  tagUsers?: string[];
}

interface ChatResponse {
  success: boolean;
  messageId?: string;
  spaceId?: string;
  error?: string;
}

export class GoogleChatAgent {
  private chat: any;
  private auth: any;
  private defaultSpaceId: string;

  constructor() {
    this.initializeAuth();
    this.defaultSpaceId = process.env.GCHAT_SPACE_ID || '';
  }

  private initializeAuth() {
    try {
      // Use service account authentication
      this.initializeServiceAccountAuth();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        '❌ Failed to initialize Google Chat authentication:',
        errorMessage
      );
      throw new Error(`Google Chat authentication failed: ${errorMessage}`);
    }
  }

  private initializeServiceAccountAuth() {
    // Load service account credentials
    const serviceAccountPath =
      process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service.json';

    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(
        `Google Chat service account file not found: ${serviceAccountPath}. Please create a service account and download the JSON key file.`
      );
    }

    const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    // Validate service account credentials
    if (!credentials.client_email || !credentials.private_key) {
      throw new Error(
        'Invalid service account credentials. Missing client_email or private_key.'
      );
    }

    // Define scopes for Google Chat API
    const SCOPES = [
      'https://www.googleapis.com/auth/chat.bot',
      'https://www.googleapis.com/auth/chat.spaces',
      'https://www.googleapis.com/auth/chat.messages',
    ];

    // Authenticate using service account
    this.auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key.replace(/\\n/g, '\n'),
      scopes: SCOPES,
    });

    // Initialize Chat API client
    this.chat = google.chat({
      version: 'v1',
      auth: this.auth,
      retryConfig: {
        retry: 3,
        retryDelay: 1000,
      },
    });
  }

  /**
   * Send a text message to a Google Chat space with enhanced features
   */
  async sendMessageToSpace(
    spaceId: string,
    text: string,
    threadId?: string,
    options?: {
      url?: string;
      urlText?: string;
      tagAll?: boolean;
      tagUsers?: string[];
    }
  ): Promise<ChatResponse> {
    try {
      // Build enhanced message content
      let messageText = text;

      // Add individual user mentions using proper annotations
      const annotations: any[] = [];
      let mentionText = '';

      if (options?.tagUsers && options.tagUsers.length > 0) {
        for (const userIdentifier of options.tagUsers) {
          let userId: string;
          let displayName: string;

          // Check if it's an email, name, or already a user ID
          if (userIdentifier.includes('@')) {
            // It's an email, find the user ID from space members
            const userResult = await this.findUserByEmail(
              spaceId,
              userIdentifier
            );
            if (userResult.success && userResult.userId) {
              userId = userResult.userId;
              displayName = userResult.displayName || userIdentifier;
            } else {
              // Email not found in space members - skip this user
              continue;
            }
          } else if (isNaN(Number(userIdentifier))) {
            // It's a name (not a numeric user ID), find ALL users with that name
            const usersResult = await this.findAllUsersByName(
              spaceId,
              userIdentifier
            );
            if (
              usersResult.success &&
              usersResult.users &&
              usersResult.users.length > 0
            ) {
              // Tag ALL users with that name
              for (const user of usersResult.users) {
                const mentionTag = `<users/${user.userId}>`;
                const startIndex = mentionText.length;
                mentionText += `${mentionTag} `;

                // Add annotation for each user
                annotations.push({
                  type: 'USER_MENTION',
                  startIndex: startIndex,
                  length: mentionTag.length,
                  userMention: {
                    user: {
                      name: `users/${user.userId}`,
                      displayName: user.displayName,
                    },
                  },
                });
              }
              continue; // Skip the single user processing below
            } else {
              // Name not found - skip this user
              continue;
            }
          } else {
            // It's already a user ID
            userId = userIdentifier;
            displayName = userIdentifier;
          }

          // Add mention text using the working format
          const mentionTag = `<users/${userId}>`;
          const startIndex = mentionText.length;
          mentionText += `${mentionTag} `;

          // Add annotation with correct startIndex
          annotations.push({
            type: 'USER_MENTION',
            startIndex: startIndex,
            length: mentionTag.length,
            userMention: {
              user: {
                name: `users/${userId}`,
                displayName: displayName,
              },
            },
          });
        }

        messageText = `${mentionText}${messageText}`;
      }

      // Add @all mention using proper Google Chat format
      if (options?.tagAll) {
        messageText = `<users/all> ${messageText}`;
      }

      // Add URL attachment
      if (options?.url) {
        if (options.urlText) {
          // Google Chat API format: <URL|Display Text>
          messageText += `\n\n<${options.url}|${options.urlText}>`;
        } else {
          messageText += `\n\n${options.url}`;
        }
      }

      const requestBody: any = {
        text: messageText,
      };

      // Add annotations if we have user mentions
      if (annotations.length > 0) {
        requestBody.annotations = annotations;
      }

      // Add thread if specified
      if (threadId) {
        requestBody.thread = {
          name: `spaces/${spaceId}/threads/${threadId}`,
        };
      }

      const response = await this.chat.spaces.messages.create({
        parent: spaceId,
        requestBody: requestBody,
      });

      const messageId = response.data.name?.split('/').pop();

      return {
        success: true,
        messageId: messageId,
        spaceId: spaceId,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
        spaceId: spaceId,
      };
    }
  }

  /**
   * Get space members for proper user mentions
   */
  async getSpaceMembers(
    spaceId: string
  ): Promise<{ success: boolean; members?: any[]; error?: string }> {
    try {
      const response = await this.chat.spaces.members.list({
        parent: spaceId,
      });

      const members = response.data.memberships || [];

      return {
        success: true,
        members: members,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Find user by email in space members
   */
  async findUserByEmail(
    spaceId: string,
    email: string
  ): Promise<{
    success: boolean;
    userId?: string;
    displayName?: string;
    error?: string;
  }> {
    try {
      const membersResult = await this.getSpaceMembers(spaceId);

      if (!membersResult.success) {
        return {
          success: false,
          error: membersResult.error,
        };
      }

      const members = membersResult.members || [];

      for (const member of members) {
        if (member.member?.email === email) {
          const userId = member.member.name?.replace('users/', '');
          return {
            success: true,
            userId: userId,
            displayName: member.member.displayName,
          };
        }
      }

      return {
        success: false,
        error: `User with email ${email} not found in space`,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Find ALL users by name (partial match, case-insensitive)
   */
  async findAllUsersByName(
    spaceId: string,
    name: string
  ): Promise<{
    success: boolean;
    users?: Array<{ userId: string; displayName: string }>;
    error?: string;
  }> {
    try {
      const membersResult = await this.getSpaceMembers(spaceId);

      if (!membersResult.success) {
        return {
          success: false,
          error: membersResult.error,
        };
      }

      const members = membersResult.members || [];
      const searchLower = name.toLowerCase();
      const matches = [];

      for (const member of members) {
        const user = member.member;
        if (user && user.displayName) {
          const displayNameLower = user.displayName.toLowerCase();

          // Check if search name is contained in display name
          if (displayNameLower.includes(searchLower)) {
            const userId = user.name?.replace('users/', '');
            matches.push({
              userId: userId,
              displayName: user.displayName,
            });
          }
        }
      }

      if (matches.length === 0) {
        return {
          success: false,
          error: `No users found with name containing "${name}"`,
        };
      }

      return {
        success: true,
        users: matches,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send enhanced message with URL and user tagging
   */
  async sendEnhancedMessage(
    spaceId: string,
    text: string,
    options?: {
      url?: string;
      urlText?: string;
      tagUsers?: string[];
      tagAll?: boolean;
      threadId?: string;
    }
  ): Promise<ChatResponse> {
    return this.sendMessageToSpace(spaceId, text, options?.threadId, options);
  }

  /**
   * Process a query and send appropriate response
   */
  async processQuery(query: string): Promise<string> {
    try {
      // Basic input validation
      if (!query || query.trim().length === 0) {
        return '❌ Query cannot be empty';
      }

      // Extract space ID and message from query
      // Expected format: "Send message 'Hello World' to space spaces/abc123" or just "Send message 'Hello World'"
      const spaceMatch = query.match(/to space (spaces\/[a-zA-Z0-9_-]+)/i);
      const messageMatch = query.match(/message ['"]([^'"]+)['"]/i);

      // Use default space ID if not specified in query
      let spaceId = spaceMatch ? spaceMatch[1] : this.defaultSpaceId;

      if (!spaceId) {
        return '❌ Please specify a space ID in the format: "Send message \'Hello World\' to space spaces/abc123" or set GCHAT_SPACE_ID environment variable';
      }

      if (!messageMatch) {
        // Try natural language parsing: "send [message] to [user]"
        const naturalMatch = query.match(/send (.+?) to (\w+)/i);
        if (naturalMatch) {
          const message = naturalMatch[1];
          const userName = naturalMatch[2];

          // Send message with user tagging
          const result = await this.sendMessageToSpace(
            spaceId,
            message,
            undefined,
            {
              tagUsers: [userName],
            }
          );

          if (result.success) {
            return `Message sent successfully to ${userName} in space ${spaceId}\nMessage ID: ${result.messageId}\nMessage: ${message}`;
          } else {
            return `Failed to send message: ${result.error}`;
          }
        } else {
          return '❌ Please specify a message in the format: "Send message \'Hello World\'" or "send [message] to [user]"';
        }
      }

      const message = messageMatch[1];

      // Extract additional options from query
      const options: any = {};

      // Check for URL
      const urlMatch = query.match(/url ['"]([^'"]+)['"]/i);
      if (urlMatch) {
        options.url = urlMatch[1];
      }

      // Check for URL text
      const urlTextMatch = query.match(/url text ['"]([^'"]+)['"]/i);
      if (urlTextMatch) {
        options.urlText = urlTextMatch[1];
      }

      // Check for names or user IDs to tag
      const namesMatch = query.match(/names ['"]([^'"]+)['"]/i);
      const userIdsMatch = query.match(/user ids ['"]([^'"]+)['"]/i);
      const tagUsersMatch = query.match(/tag users ['"]([^'"]+)['"]/i);

      if (namesMatch) {
        options.tagUsers = namesMatch[1].split(',').map((u) => u.trim());
      } else if (userIdsMatch) {
        options.tagUsers = userIdsMatch[1].split(',').map((u) => u.trim());
      } else if (tagUsersMatch) {
        options.tagUsers = tagUsersMatch[1].split(',').map((u) => u.trim());
      }

      // Check for @all tag
      if (query.includes('tag all') || query.includes('@all')) {
        options.tagAll = true;
      }

      const result = await this.sendMessageToSpace(
        spaceId,
        message,
        undefined,
        options
      );

      if (result.success) {
        let response = `Message sent successfully to space ${spaceId}
Message ID: ${result.messageId}
Message: ${message}`;

        if (options.url) {
          response += `\nURL: ${options.url}`;
        }
        if (options.tagUsers) {
          response += `\nTagged users: ${options.tagUsers.join(', ')}`;
        }
        if (options.tagAll) {
          response += `\nTagged: @all`;
        }

        return response;
      } else {
        return `Failed to send message: ${result.error}`;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error processing query: ${errorMessage}`;
    }
  }

  /**
   * Send a simple message to the default space
   */
  async sendSimpleMessage(
    text: string,
    options?: {
      tagUsers?: string[];
      tagAll?: boolean;
      url?: string;
      urlText?: string;
    }
  ): Promise<ChatResponse> {
    if (!this.defaultSpaceId) {
      return {
        success: false,
        error:
          'No default space ID configured. Set GCHAT_SPACE_ID environment variable.',
      };
    }

    return this.sendMessageToSpace(
      this.defaultSpaceId,
      text,
      undefined,
      options
    );
  }

  /**
   * Get available operations
   */
  getAvailableOperations(): string[] {
    return [
      'sendMessageToSpace',
      'sendEnhancedMessage',
      'sendSimpleMessage',
      'getSpaceMembers',
      'findUserByEmail',
      'findAllUsersByName',
      'processQuery',
    ];
  }
}

// Export a default instance
export const googleChatAgent = new GoogleChatAgent();
