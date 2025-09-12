// workflows/android/android-workflow.ts - Android workflow definition

import type { WorkflowDefinition } from '../../types/index.js';

export const createAndroidWorkflow = (
  command: string,
  projectPath?: string
): WorkflowDefinition => {
  return {
    id: 'android-command-workflow',
    name: 'Execute Android Command',
    active: true,
    settings: {},
    nodes: [
      {
        id: 'android-node-1',
        type: 'android',
        name: 'Execute Android Command',
        position: { x: 100, y: 100 },
        parameters: {
          command: command,
          projectPath: projectPath || process.cwd(),
          timeout: 1500, // 25 minutes for low-end devices
        },
      },
    ],
    connections: {
      'android-node-1': [], // No outgoing connections - end node
    },
  };
};
