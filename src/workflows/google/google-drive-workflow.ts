// workflows/google/google-drive-workflow.ts - Google Drive workflow definitions

import type { WorkflowDefinition } from '../../types/index.js';

export const createGoogleDriveUploadWorkflow = (
  filePath: string,
  folderId?: string,
  fileName?: string
): WorkflowDefinition => {
  return {
    id: 'google-drive-upload-workflow',
    name: 'Upload File to Google Drive',
    active: true,
    settings: {},
    nodes: [
      {
        id: 'google-drive-node-1',
        type: 'googleDrive',
        name: 'Upload to Google Drive',
        position: { x: 100, y: 100 },
        parameters: {
          operation: 'uploadFile',
          filePath: filePath,
          fileName: fileName,
          folderId: folderId,
          enableProgress: true,
        },
        credentials: {
          googleDriveServiceAccount: {
            serviceAccountPath:
              process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
              './drive-agent-service.json',
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
          },
        },
      },
    ],
    connections: {
      'google-drive-node-1': [], // No outgoing connections - end node
    },
  };
};

export const createGoogleDriveListWorkflow = (
  folderId?: string,
  pageSize: number = 10
): WorkflowDefinition => {
  return {
    id: 'google-drive-list-workflow',
    name: 'List Google Drive Files',
    active: true,
    settings: {},
    nodes: [
      {
        id: 'google-drive-node-1',
        type: 'googleDrive',
        name: 'List Files',
        position: { x: 100, y: 100 },
        parameters: {
          operation: 'listFiles',
          folderId: folderId,
          pageSize: pageSize,
        },
        credentials: {
          googleDriveServiceAccount: {
            serviceAccountPath:
              process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
              './drive-agent-service.json',
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
          },
        },
      },
    ],
    connections: {
      'google-drive-node-1': [], // No outgoing connections - end node
    },
  };
};

// Complex workflow for uploading large files with progress tracking
export const createGoogleDriveLargeFileUploadWorkflow = (
  filePath: string,
  folderId?: string,
  fileName?: string
): WorkflowDefinition => {
  return {
    id: 'google-drive-large-file-upload-workflow',
    name: 'Upload Large File to Google Drive with Progress',
    active: true,
    settings: {
      enableProgressTracking: true,
      chunkSize: 8 * 1024 * 1024, // 8MB chunks
      maxRetries: 3,
    },
    nodes: [
      {
        id: 'google-drive-upload-node',
        type: 'googleDrive',
        name: 'Upload Large File',
        position: { x: 100, y: 100 },
        parameters: {
          operation: 'uploadFile',
          filePath: filePath,
          fileName: fileName,
          folderId: folderId,
          enableProgress: true,
        },
        credentials: {
          googleDriveServiceAccount: {
            serviceAccountPath:
              process.env.GOOGLE_SERVICE_ACCOUNT_PATH ||
              './drive-agent-service.json',
            folderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
          },
        },
      },
    ],
    connections: {
      'google-drive-upload-node': [], // No outgoing connections - end node
    },
  };
};

// Workflow for batch operations (upload multiple files)
export const createGoogleDriveBatchUploadWorkflow = (
  files: Array<{
    filePath: string;
    fileName?: string;
    folderId?: string;
  }>
): WorkflowDefinition => {
  const nodes = files.map((file, index) => ({
    id: `google-drive-upload-node-${index}`,
    type: 'googleDrive',
    name: `Upload ${file.fileName || 'File'} ${index + 1}`,
    position: { x: 100, y: 100 + index * 150 },
    parameters: {
      operation: 'uploadFile',
      filePath: file.filePath,
      fileName: file.fileName,
      folderId: file.folderId,
      enableProgress: true,
    },
    credentials: {
      googleDriveApi: {
        accessToken: process.env.GOOGLE_DRIVE_ACCESS_TOKEN,
      },
    },
  }));

  const connections: Record<string, any[]> = {};
  nodes.forEach((node, index) => {
    connections[node.id] = [];
  });

  return {
    id: 'google-drive-batch-upload-workflow',
    name: 'Batch Upload Files to Google Drive',
    active: true,
    settings: {
      batchSize: files.length,
      enableProgressTracking: true,
      parallelUploads: true,
    },
    nodes,
    connections,
  };
};
