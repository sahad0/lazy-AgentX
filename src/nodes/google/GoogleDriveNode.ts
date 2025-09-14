// nodes/google/GoogleDriveNode.ts - Google Drive workflow node

import { BaseNode } from '../BaseNode.js';
import type {
  NodeDefinition,
  NodeExecuteResult,
  WorkflowData,
} from '../../types/index.js';
import * as fs from 'fs';
import * as path from 'path';

export class GoogleDriveNode extends BaseNode {
  getDefinition(): NodeDefinition {
    return {
      name: 'googleDrive',
      displayName: 'Google Drive',
      description:
        'Upload files to Google Drive with streaming support for large files',
      version: 1,
      defaults: {
        name: 'Google Drive Upload',
      },
      inputs: ['main'],
      outputs: ['main'],
      properties: [
        {
          displayName: 'Operation',
          name: 'operation',
          type: 'options',
          default: 'uploadFile',
          required: true,
          description: 'The operation to perform',
          options: [
            {
              name: 'Upload File',
              value: 'uploadFile',
            },
          ],
        },
        {
          displayName: 'File Path',
          name: 'filePath',
          type: 'string',
          required: true,
          description: 'Local file path to upload',
        },
        {
          displayName: 'File Name',
          name: 'fileName',
          type: 'string',
          description:
            'Custom name for the file in Google Drive (defaults to original filename)',
        },
        {
          displayName: 'Folder ID',
          name: 'folderId',
          type: 'string',
          description:
            'Google Drive folder ID to upload to (optional, uploads to root if not specified)',
        },
        {
          displayName: 'Folder Name',
          name: 'folderName',
          type: 'string',
          description: 'Name for new folder when creating folders',
        },
        {
          displayName: 'Page Size',
          name: 'pageSize',
          type: 'number',
          default: 10,
          description: 'Number of files to return when listing files',
        },
        {
          displayName: 'Enable Progress Tracking',
          name: 'enableProgress',
          type: 'boolean',
          default: true,
          description: 'Enable progress tracking for large file uploads',
        },
      ],
      credentials: [
        {
          name: 'googleDriveServiceAccount',
          displayName: 'Google Drive Service Account',
          properties: [
            {
              displayName: 'Service Account Path',
              name: 'serviceAccountPath',
              type: 'string',
              required: false,
              description:
                'Path to service account JSON file (defaults to ./service.json)',
            },
            {
              displayName: 'Folder ID',
              name: 'folderId',
              type: 'string',
              required: false,
              description:
                'Google Drive folder/shared drive ID (defaults to GOOGLE_DRIVE_FOLDER_ID env var)',
            },
          ],
        },
      ],
    };
  }

  async execute(inputData: WorkflowData): Promise<NodeExecuteResult> {
    try {
      this.validateRequiredCredentials(['googleDriveServiceAccount']);

      const operation = this.getParameter('operation', 'uploadFile');

      // Import and use the GoogleDriveAgent for service account automation
      const { GoogleDriveAgent } = await import(
        '../../agents/google/GoogleDriveAgent.js'
      );
      const agent = new GoogleDriveAgent();

      switch (operation) {
        case 'uploadFile':
          return await this.uploadFileWithAgent(inputData, agent);
        default:
          throw new Error(`Unknown operation: ${operation}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return this.createErrorResult(errorMessage);
    }
  }

  private async uploadFileWithAgent(
    inputData: WorkflowData,
    agent: any
  ): Promise<NodeExecuteResult> {
    const filePath = this.getParameter('filePath');
    const fileName = this.getParameter('fileName');
    const folderId = this.getParameter('folderId');

    if (!filePath) {
      throw new Error('File path is required for upload operation');
    }

    console.log(`📁 Uploading file: ${fileName || path.basename(filePath)}`);
    console.log(`📂 File path: ${filePath}`);

    // Use the GoogleDriveAgent for service account automation
    const result = await agent.uploadFile(filePath, folderId, fileName);

    return this.createSuccessResult({
      operation: 'uploadFile',
      message: result,
      ...inputData,
    });
  }

  private async resumableUpload(
    filePath: string,
    folderId: string | undefined,
    fileName: string,
    enableProgress: boolean,
    inputData: WorkflowData
  ): Promise<NodeExecuteResult> {
    const credentials = this.getCredential('googleDriveApi');
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const startTime = Date.now();

    try {
      // Step 1: Initiate resumable upload session
      console.log(`🔄 Initiating resumable upload session...`);
      const uploadUrl = await this.initiateResumableUpload(
        fileName,
        fileSize,
        folderId,
        credentials.accessToken
      );

      if (!uploadUrl) {
        throw new Error('Failed to initiate resumable upload session');
      }

      console.log(`✅ Upload session initiated`);

      // Step 2: Upload file in chunks
      console.log(`📤 Uploading file in chunks...`);
      const result = await this.uploadFileInChunks(
        filePath,
        uploadUrl,
        fileSize,
        enableProgress
      );

      const uploadTime = (Date.now() - startTime) / 1000;

      return this.createSuccessResult({
        operation: 'uploadFile',
        method: 'resumable',
        file: {
          id: result.id,
          name: result.name,
          size: result.size,
          mimeType: result.mimeType,
          createdTime: result.createdTime,
          modifiedTime: result.modifiedTime,
          webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
          webContentLink: `https://drive.google.com/file/d/${result.id}/view?usp=sharing`,
        },
        uploadStats: {
          originalSize: fileSize,
          uploadTime: uploadTime,
          averageSpeed: fileSize / uploadTime,
        },
        ...inputData,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Resumable upload failed: ${errorMessage}`);
    }
  }

  private async simpleUpload(
    filePath: string,
    folderId: string | undefined,
    fileName: string,
    enableProgress: boolean,
    inputData: WorkflowData
  ): Promise<NodeExecuteResult> {
    const credentials = this.getCredential('googleDriveApi');
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const startTime = Date.now();

    try {
      console.log(`📤 Uploading file using simple upload method...`);

      const fileStream = fs.createReadStream(filePath);
      const result = await this.uploadFileStream(
        fileStream,
        fileName,
        fileSize,
        folderId,
        credentials.accessToken
      );

      const uploadTime = (Date.now() - startTime) / 1000;

      return this.createSuccessResult({
        operation: 'uploadFile',
        method: 'simple',
        file: {
          id: result.id,
          name: result.name,
          size: result.size,
          mimeType: result.mimeType,
          createdTime: result.createdTime,
          modifiedTime: result.modifiedTime,
          webViewLink: `https://drive.google.com/file/d/${result.id}/view`,
          webContentLink: `https://drive.google.com/file/d/${result.id}/view?usp=sharing`,
        },
        uploadStats: {
          originalSize: fileSize,
          uploadTime: uploadTime,
          averageSpeed: fileSize / uploadTime,
        },
        ...inputData,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Simple upload failed: ${errorMessage}`);
    }
  }

  private async initiateResumableUpload(
    fileName: string,
    fileSize: number,
    folderId: string | undefined,
    accessToken: string
  ): Promise<string | null> {
    const metadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': 'application/octet-stream',
          'X-Upload-Content-Length': fileSize.toString(),
        },
        body: JSON.stringify(metadata),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to initiate resumable upload: ${response.status} ${errorText}`
      );
    }

    return response.headers.get('Location');
  }

  private async uploadFileInChunks(
    filePath: string,
    uploadUrl: string,
    fileSize: number,
    enableProgress: boolean
  ): Promise<any> {
    const chunkSize = 8 * 1024 * 1024; // 8MB chunks
    let uploadedBytes = 0;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const fileStream = fs.createReadStream(filePath, {
        highWaterMark: chunkSize,
      });

      fileStream.on('data', async (chunk) => {
        fileStream.pause();

        try {
          const chunkStart = uploadedBytes;
          const chunkEnd = Math.min(
            uploadedBytes + chunk.length - 1,
            fileSize - 1
          );

          const response = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Range': `bytes ${chunkStart}-${chunkEnd}/${fileSize}`,
              'Content-Type': 'application/octet-stream',
            },
            body: chunk as any,
          });

          if (response.status === 200 || response.status === 201) {
            // Upload complete
            const result = await response.json();
            resolve(result);
            return;
          } else if (response.status === 308) {
            // Resume upload
            uploadedBytes += chunk.length;

            if (enableProgress) {
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = uploadedBytes / elapsed;
              const eta = (fileSize - uploadedBytes) / speed;
              const percentage = Math.round((uploadedBytes / fileSize) * 100);

              console.log(
                `📊 Progress: ${percentage}% (${this.formatFileSize(uploadedBytes)}/${this.formatFileSize(fileSize)}) - ${this.formatSpeed(speed)} - ETA: ${this.formatTime(eta)}`
              );
            }

            fileStream.resume();
          } else {
            throw new Error(`Upload failed with status: ${response.status}`);
          }
        } catch (error) {
          reject(error);
        }
      });

      fileStream.on('error', reject);
      fileStream.on('end', () => {
        if (uploadedBytes < fileSize) {
          reject(new Error('Upload incomplete'));
        }
      });
    });
  }

  private async uploadFileStream(
    fileStream: any,
    fileName: string,
    fileSize: number,
    folderId: string | undefined,
    accessToken: string
  ): Promise<any> {
    const metadata = {
      name: fileName,
      parents: folderId ? [folderId] : undefined,
    };

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(metadata));
    formData.append('file', fileStream);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData as any,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    return await response.json();
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private formatSpeed(bytesPerSecond: number): string {
    return this.formatFileSize(bytesPerSecond) + '/s';
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}
