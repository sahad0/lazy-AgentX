# Google Drive Agent Setup Guide

## 🚀 Overview

The Google Drive agent provides advanced upload capabilities with automatic optimization:

- **Simple Upload**: For files under 5MB with basic progress tracking (Google's recommended threshold)
- **Resumable Upload**: For files 5MB+ with streaming, chunked uploads, and detailed progress tracking
- **Service Account Authentication**: Perfect for automation and background workflows
- **Shared Drive Support**: Full compatibility with Google Workspace shared drives

## 🔧 Setup

### 1. Service Account Setup (Recommended for Production)

The agent uses Google Service Account authentication for reliable automation:

```bash
# Set the path to your service account JSON file
export GOOGLE_SERVICE_ACCOUNT_PATH="/path/to/your/service-account.json"

# Set the Google Drive folder ID for uploads
export GOOGLE_DRIVE_FOLDER_ID="your-folder-id"
```

### 2. Creating a Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Drive API
4. Create a Service Account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name: "AgentLazyX1-GoogleDrive"
   - Role: "Editor" (or custom role with Drive permissions)
5. Generate JSON key:
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key" > JSON
   - Save as `drive-agent-service.json` in project root

### 3. Shared Drive Setup (Recommended)

For service accounts to work properly, you need a shared folder:

1. Create a folder in your Google Drive
2. Right-click the folder > "Share"
3. Add your service account email (from the JSON file)
4. Grant "Editor" permissions
5. Copy the folder ID from the URL (the long string after /folders/)
6. Set environment variable: `export GOOGLE_DRIVE_FOLDER_ID="your-folder-id"`

### 4. Required Scopes

The service account automatically uses these scopes:

- `https://www.googleapis.com/auth/drive.file` - Upload/create files
- `https://www.googleapis.com/auth/drive.readonly` - Read files/folders

## 🎯 Usage

### Via MCP Tools (Cursor IDE)

#### Upload a File

```javascript
// Upload a large file (5MB+) - automatically uses resumable upload
await google_drive_upload({
  filePath: '/path/to/your/large-file.zip',
  folderId: 'optional-folder-id',
  fileName: 'custom-name.zip',
  enableProgress: true,
});

// Upload a small file (<5MB) - uses simple upload
await google_drive_upload({
  filePath: '/path/to/your/file.pdf',
  enableProgress: true,
});

// Upload with progress tracking disabled
await google_drive_upload({
  filePath: '/path/to/your/file.txt',
  enableProgress: false,
});
```

#### List Files

```javascript
// List files in root directory
await google_drive_list({
  pageSize: 20,
});

// List files in specific folder
await google_drive_list({
  folderId: 'your-folder-id',
  pageSize: 10,
});
```

### Via Direct Agent Usage

```typescript
import { GoogleDriveAgent } from './src/agents/google/GoogleDriveAgent.js';

const agent = new GoogleDriveAgent();

// Upload with progress tracking
const result = await agent.uploadFile(
  '/path/to/large-file.zip',
  'folder-id', // optional
  'custom-name.zip', // optional
  (progress) => {
    console.log(
      `Progress: ${progress.percentage}% - Speed: ${progress.speed} - ETA: ${progress.eta}s`
    );
  }
);
```

## 🔥 Key Features

### 1. **Streaming Upload for Large Files**

- Automatically detects files > 100MB
- Uses resumable upload with 8MB chunks
- Efficient memory usage (doesn't load entire file into memory)

### 2. **Progress Tracking**

- Real-time upload progress
- Speed calculation (MB/s)
- ETA estimation
- Percentage completion

### 3. **Error Handling**

- Comprehensive error messages
- Retry logic for network issues
- Validation of file existence and permissions

### 4. **Flexible Configuration**

- Upload to specific folders or root
- Custom file names
- Configurable chunk sizes
- Progress tracking toggle

## 📊 Upload Methods

### Simple Upload (< 100MB)

- Direct multipart upload
- Faster for small files
- Single request

### Resumable Upload (≥ 100MB)

- Chunked upload with resume capability
- Better for large files and unstable connections
- Progress tracking built-in

## 🛠️ Workflow Integration

The agent integrates with the workflow engine:

```typescript
import { createGoogleDriveUploadWorkflow } from './src/workflows/google/google-drive-workflow.js';

const workflow = createGoogleDriveUploadWorkflow(
  '/path/to/file.zip',
  'folder-id', // optional
  'custom-name.zip' // optional
);
```

## 🔍 Example Output

```
**✅ File Uploaded Successfully to Google Drive**

**File:** large-video.mp4
**Size:** 2.5 GB
**Method:** Resumable Upload
**Upload Time:** 15m 30s

**Google Drive Details:**
- **File ID:** 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms
- **File Name:** large-video.mp4
- **File Size:** 2.5 GB
- **MIME Type:** video/mp4
- **Created:** 2024-01-15T10:30:00.000Z
- **Modified:** 2024-01-15T10:30:00.000Z

**Direct Link:** https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view
**Share Link:** https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing
```

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Error**
   - Verify access token is valid
   - Check token expiration
   - Ensure proper scopes

2. **File Not Found**
   - Verify file path is correct
   - Check file permissions
   - Ensure file exists

3. **Upload Timeout**
   - Large files may take time
   - Check network stability
   - Consider using resumable upload

4. **Permission Denied**
   - Verify folder ID is correct
   - Check folder permissions
   - Ensure you have write access

### Debug Tips

- Enable progress tracking to monitor upload status
- Check console logs for detailed error messages
- Verify network connectivity
- Test with smaller files first

## 📈 Performance Tips

1. **For Large Files**
   - Use resumable upload (automatic for >100MB)
   - Enable progress tracking
   - Ensure stable network connection

2. **For Multiple Files**
   - Upload files sequentially to avoid rate limits
   - Use batch workflow for multiple files

3. **Memory Usage**
   - Agent uses streaming, so memory usage is minimal
   - No need to worry about file size limits

## 🔗 Related Files

- `src/agents/google/GoogleDriveAgent.ts` - Main agent implementation
- `src/nodes/google/GoogleDriveNode.ts` - Workflow node
- `src/workflows/google/google-drive-workflow.ts` - Workflow definitions
- `src/mcp/AgentLazyX1MCPServer.ts` - MCP tool integration
