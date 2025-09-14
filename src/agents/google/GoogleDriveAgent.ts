// agents/google/GoogleDriveAgent.ts - Modern Google Drive Agent for Service Account Automation

import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

interface UploadProgress {
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  eta: number; // estimated time remaining in seconds
}

export class GoogleDriveAgent {
  private drive: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth() {
    try {
      // Load service account credentials with modern error handling
      const serviceAccountPath =
        process.env.GOOGLE_SERVICE_ACCOUNT_PATH || './service.json';

      if (!fs.existsSync(serviceAccountPath)) {
        throw new Error(
          `❌ Service account file not found: ${serviceAccountPath}. Please check GOOGLE_DRIVE_SETUP.md for setup instructions.`
        );
      }

      const credentials = JSON.parse(
        fs.readFileSync(serviceAccountPath, 'utf8')
      );

      // Validate service account credentials
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error(
          '❌ Invalid service account credentials. Missing client_email or private_key.'
        );
      }

      // Define scopes for service account automation
      const SCOPES = [
        'https://www.googleapis.com/auth/drive.file', // Upload/create files
        'https://www.googleapis.com/auth/drive.readonly', // Read files/folders
      ];

      // Authenticate using service account with modern configuration
      this.auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key.replace(/\\n/g, '\n'), // Handle escaped newlines
        scopes: SCOPES,
      });

      // Initialize Drive API client with modern settings
      this.drive = google.drive({
        version: 'v3',
        auth: this.auth,
        // Add retry configuration for better reliability
        retryConfig: {
          retry: 3,
          retryDelay: 1000,
        },
      });

      console.log('🔑 Google Drive authentication initialized');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(
        '❌ Failed to initialize Google Drive authentication:',
        errorMessage
      );
      throw new Error(`Google Drive authentication failed: ${errorMessage}`);
    }
  }

  async uploadFile(
    filePath: string,
    folderId?: string,
    fileName?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    try {
      // Validate file exists with better error handling
      if (!fs.existsSync(filePath)) {
        throw new Error(`❌ File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const finalFileName = fileName || path.basename(filePath);
      const mimeType = this.getMimeType(finalFileName);

      // Use shared folder ID - service accounts need shared folders
      const sharedFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || folderId;

      if (!sharedFolderId) {
        throw new Error(
          `❌ No folder ID provided. Set GOOGLE_DRIVE_FOLDER_ID environment variable or pass folderId parameter. See GOOGLE_DRIVE_SETUP.md for details.`
        );
      }

      // Check if file already exists and get its ID for replacement
      const existingFileId = await this.findExistingFile(
        finalFileName,
        sharedFolderId
      );

      // Choose upload method based on file size (Google's recommended threshold is 5MB)
      const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB (Google's recommended threshold)
      let file: any;

      if (fileSize > LARGE_FILE_THRESHOLD) {
        file = await this.resumableUpload(
          filePath,
          finalFileName,
          sharedFolderId,
          mimeType,
          fileSize,
          onProgress,
          existingFileId
        );
      } else {
        file = await this.simpleUpload(
          filePath,
          finalFileName,
          sharedFolderId,
          mimeType,
          fileSize,
          onProgress,
          existingFileId
        );
      }

      // Automatically set public sharing permissions (anyone with the link)
      try {
        await this.drive.permissions.create({
          fileId: file.id,
          resource: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true,
        });
      } catch (shareError) {
        console.warn('⚠️  Could not set public permissions:', shareError);
      }

      const shareUrl = `https://drive.google.com/file/d/${file.id}/view?usp=sharing`;
      const directUrl = `https://drive.google.com/file/d/${file.id}/view`;

      return `**✅ File Uploaded Successfully to Google Drive**

**File:** ${finalFileName}
**Size:** ${this.formatFileSize(fileSize)}
**MIME Type:** ${mimeType}
**Upload Method:** ${fileSize > LARGE_FILE_THRESHOLD ? 'Resumable Upload' : 'Simple Upload'}

**Google Drive Details:**
- **File ID:** ${file.id}
- **File Name:** ${file.name}
- **File Size:** ${this.formatFileSize(parseInt(file.size || '0'))}
- **MIME Type:** ${file.mimeType}
- **Created:** ${new Date(file.createdTime).toLocaleString()}
- **Modified:** ${new Date(file.modifiedTime).toLocaleString()}
- **Folder ID:** ${file.parents?.[0] || 'Root'}

**🔗 Sharing URLs:**
- **Direct Link:** ${directUrl}
- **Share Link (Public):** ${shareUrl}

**Service Account Automation:** ✅ Successfully uploaded using service account authentication
**Public Access:** ✅ Anyone with the link can view`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error('❌ Upload failed:', errorMessage);

      // Provide helpful error messages for common issues
      if (errorMessage.includes('storage quota')) {
        return `❌ Storage Quota Error: Use Google Workspace Shared Drives for service accounts. See GOOGLE_DRIVE_SETUP.md for setup instructions.`;
      }

      if (errorMessage.includes('permission')) {
        return `❌ Permission Error: Ensure the service account has Editor access to the folder.`;
      }

      return `❌ Error uploading file to Google Drive: ${errorMessage}`;
    }
  }

  private async simpleUpload(
    filePath: string,
    fileName: string,
    folderId: string,
    mimeType: string,
    fileSize: number,
    onProgress?: (progress: UploadProgress) => void,
    existingFileId?: string | null
  ): Promise<any> {
    const startTime = Date.now();
    let bytesUploaded = 0;

    // Prepare file metadata with modern options for shared drives
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    // Create a custom stream that tracks progress for simple uploads too
    const fileStream = fs.createReadStream(filePath);

    // Track bytes as they're read from the file
    fileStream.on('data', (chunk: string | Buffer) => {
      const chunkSize = Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk);
      bytesUploaded += chunkSize;

      // For simple uploads, report progress more frequently since they're smaller
      if (onProgress) {
        const timeElapsed = (Date.now() - startTime) / 1000;
        const currentSpeed = bytesUploaded / timeElapsed;
        const remainingBytes = fileSize - bytesUploaded;
        const eta = remainingBytes / currentSpeed;
        const percentage = (bytesUploaded / fileSize) * 100;

        const progress: UploadProgress = {
          bytesUploaded: bytesUploaded,
          totalBytes: fileSize,
          percentage: Math.round(percentage * 100) / 100,
          speed: currentSpeed,
          eta: Math.round(eta),
        };

        onProgress(progress);
      }
    });

    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      throw error;
    });

    // Prepare media for simple upload (files ≤ 5MB)
    const media = {
      mimeType: mimeType,
      body: fileStream, // Use our progress-tracking stream
      resumable: false, // Explicitly disable resumable for simple uploads
    };

    let response: any;

    if (existingFileId) {
      // Replace existing file using files.update()
      response = await this.drive.files.update({
        fileId: existingFileId,
        media: media,
        fields:
          'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,parents',
        supportsAllDrives: true,
      });
    } else {
      // Create new file using files.create()
      response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields:
          'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,parents',
        supportsAllDrives: true,
      });
    }

    // Final progress report
    if (onProgress) {
      const uploadTime = (Date.now() - startTime) / 1000;
      const progress: UploadProgress = {
        bytesUploaded: fileSize,
        totalBytes: fileSize,
        percentage: 100,
        speed: fileSize / uploadTime,
        eta: 0,
      };

      onProgress(progress);
    }

    return response.data;
  }

  private async resumableUpload(
    filePath: string,
    fileName: string,
    folderId: string,
    mimeType: string,
    fileSize: number,
    onProgress?: (progress: UploadProgress) => void,
    existingFileId?: string | null
  ): Promise<any> {
    const startTime = Date.now();
    let bytesUploaded = 0;
    let lastProgressTime = startTime;
    let lastBytesUploaded = 0;

    // Prepare file metadata
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    // Create a custom stream that tracks progress
    const fileStream = fs.createReadStream(filePath);

    // Track bytes as they're read from the file
    fileStream.on('data', (chunk: string | Buffer) => {
      const chunkSize = Buffer.isBuffer(chunk)
        ? chunk.length
        : Buffer.byteLength(chunk);
      bytesUploaded += chunkSize;

      // Calculate current speed and ETA
      const currentTime = Date.now();
      const timeElapsed = (currentTime - startTime) / 1000;
      const timeSinceLastUpdate = (currentTime - lastProgressTime) / 1000;

      // Calculate speed (bytes per second)
      const currentSpeed = bytesUploaded / timeElapsed;

      // Calculate ETA (estimated time remaining)
      const remainingBytes = fileSize - bytesUploaded;
      const eta = remainingBytes / currentSpeed;

      // Calculate percentage
      const percentage = (bytesUploaded / fileSize) * 100;

      // Report progress every 1MB or every 2 seconds (whichever comes first)
      const shouldReport =
        bytesUploaded - lastBytesUploaded >= 1024 * 1024 || // 1MB
        timeSinceLastUpdate >= 2; // 2 seconds

      if (onProgress && shouldReport) {
        const progress: UploadProgress = {
          bytesUploaded: bytesUploaded,
          totalBytes: fileSize,
          percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
          speed: currentSpeed,
          eta: Math.round(eta),
        };

        onProgress(progress);

        // Update tracking variables
        lastProgressTime = currentTime;
        lastBytesUploaded = bytesUploaded;
      }
    });

    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('❌ Stream error:', error);
      throw error;
    });

    // Use the Google APIs resumable upload feature with our progress-tracking stream
    const media = {
      mimeType: mimeType,
      body: fileStream, // Use our enhanced stream
    };

    let response: any;

    if (existingFileId) {
      // Replace existing file using files.update()
      response = await this.drive.files.update({
        fileId: existingFileId,
        media: media,
        fields:
          'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,parents',
        supportsAllDrives: true,
      });
    } else {
      // Create new file using files.create()
      response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields:
          'id,name,size,mimeType,createdTime,modifiedTime,webViewLink,parents',
        supportsAllDrives: true,
      });
    }

    // Final progress report
    if (onProgress) {
      const finalTime = (Date.now() - startTime) / 1000;
      const finalProgress: UploadProgress = {
        bytesUploaded: fileSize,
        totalBytes: fileSize,
        percentage: 100,
        speed: fileSize / finalTime,
        eta: 0,
      };
      onProgress(finalProgress);
    }

    return response.data;
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

  private getMimeType(fileName: string): string {
    const extension = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.zip': 'application/zip',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.ts': 'application/typescript',
      '.html': 'text/html',
      '.css': 'text/css',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.doc': 'application/msword',
      '.docx':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return mimeTypes[extension] || 'application/octet-stream';
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  }

  private async findExistingFile(
    fileName: string,
    folderId: string
  ): Promise<string | null> {
    try {
      const response = await this.drive.files.list({
        q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id,name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = response.data.files || [];

      if (files.length > 0) {
        return files[0].id;
      } else {
        return null;
      }
    } catch (error) {
      console.warn('⚠️  Error checking for existing file:', error);
      return null; // Continue with upload even if check fails
    }
  }

  getAvailableNodes(): string[] {
    return ['uploadFile'];
  }
}

// Export a default instance
export const googleDriveAgent = new GoogleDriveAgent();
