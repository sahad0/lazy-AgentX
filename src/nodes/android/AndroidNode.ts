// nodes/android/AndroidNode.ts - Android workflow node

import { BaseNode } from '../BaseNode.js';
import type {
  NodeDefinition,
  NodeExecuteResult,
  WorkflowData,
} from '../../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AndroidNode extends BaseNode {
  getDefinition(): NodeDefinition {
    return {
      name: 'android',
      displayName: 'Android',
      description: 'Execute Android build commands and yarn scripts',
      version: 1,
      defaults: {
        name: 'Android',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Command',
          name: 'command',
          type: 'string',
          required: true,
          description:
            'The command to execute (e.g., "yarn build", "yarn android:release")',
        },
        {
          displayName: 'Project Path',
          name: 'projectPath',
          type: 'string',
          required: false,
          description:
            'Path to the project directory (defaults to current directory)',
        },
        {
          displayName: 'Timeout (seconds)',
          name: 'timeout',
          type: 'number',
          default: 300,
          description: 'Command timeout in seconds (default: 300)',
        },
      ],
    };
  }

  async execute(inputData: WorkflowData): Promise<NodeExecuteResult> {
    try {
      const command = this.getParameter('command');
      const projectPath = this.getParameter('projectPath') || process.cwd();
      const timeout = this.getParameter('timeout', 300) * 1000; // Convert to milliseconds

      if (!command) {
        throw new Error('Command is required');
      }

      // Execute the command
      const { stdout, stderr } = await execAsync(command, {
        cwd: projectPath,
        timeout: timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      const result = {
        command,
        projectPath,
        stdout,
        stderr,
        success: true,
        ...inputData, // Pass through input data
      };

      return this.createSuccessResult(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.createErrorResult(errorMessage);
    }
  }
}
