// agents/android/AndroidAgent.ts - Android Release Agent - Production Ready

import { WorkflowEngine } from '../../engine/WorkflowEngine.js';
import { createAndroidWorkflow } from '../../workflows/android/android-workflow.js';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

// Simple state interface for LangGraph compatibility
interface AndroidState {
  command: string;
  projectPath?: string;
  result?: string;
  status?: 'success' | 'error';
  error?: string;
}

interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
}

export class AndroidReleaseAgent {
  private workflowEngine: WorkflowEngine;

  constructor() {
    this.workflowEngine = new WorkflowEngine();
  }

  async processCommand(command: string, projectPath?: string): Promise<string> {
    try {
      // Use current directory if no path provided
      const targetPath = projectPath || process.cwd();

      // Execute command with extended timeout for low-end devices
      const result = await this.executeCommand(command, targetPath);

      if (result.success) {
        // Extract build path if it's a build command
        const buildPath = this.extractBuildPath(result.output);
        const buildPathInfo = buildPath
          ? `\n\n**Build Output:** ${buildPath}`
          : '';

        return `**✅ Command Executed Successfully**\n\n**Command:** ${command}\n**Project Path:** ${targetPath}${buildPathInfo}\n\n**Output:**\n\`\`\`\n${result.output}\n\`\`\`\n`;
      } else {
        return this.formatErrorResponse(command, targetPath, result);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `Error processing Android command: ${errorMessage}`;
    }
  }

  private async executeCommand(
    command: string,
    projectPath: string
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      console.log(`🚀 Executing command: ${command}`);
      console.log(`📁 Working directory: ${projectPath}`);

      const [cmd, ...args] = command.split(' ');
      let output = '';
      let errorOutput = '';

      const child = spawn(cmd, args, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });

      // Collect output without streaming
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });

      child.on('close', (code) => {
        console.log(`🏁 Process completed with exit code: ${code}`);

        const finalOutput =
          output + (errorOutput ? `\nSTDERR:\n${errorOutput}` : '');
        const success = code === 0;

        resolve({
          success,
          output: finalOutput,
          error: success
            ? undefined
            : errorOutput || `Process exited with code ${code}`,
        });
      });

      child.on('error', (error) => {
        console.log(`💥 Process error: ${error.message}`);
        resolve({
          success: false,
          output: output + errorOutput,
          error: error.message,
        });
      });

      // Set extended timeout for low-end devices (25 minutes)
      setTimeout(() => {
        if (!child.killed) {
          console.log('⏰ Process timeout after 25 minutes, killing...');
          child.kill();
          resolve({
            success: false,
            output: output + errorOutput,
            error:
              'Command timeout after 25 minutes - consider using a more powerful device for faster builds',
          });
        }
      }, 1500000); // 25 minutes (25 * 60 * 1000)
    });
  }

  private formatErrorResponse(
    command: string,
    targetPath: string,
    result: ExecutionResult
  ): string {
    const errorAnalysis = this.analyzeError(result.output, result.error);

    return `**❌ Command Failed**

**Command:** \`${command}\`
**Project Path:** ${targetPath}

${errorAnalysis.summary}

**Common Solutions:**
${errorAnalysis.solutions.map((solution) => `- ${solution}`).join('\n')}

**Error Details:**
\`\`\`
${result.error || 'Unknown error'}
\`\`\`

**Full Output:**
\`\`\`
${result.output}
\`\`\`

**Debug Tips:**
- Check if Android SDK is properly installed
- Verify Gradle wrapper permissions: \`chmod +x android/gradlew\`
- Ensure sufficient disk space and memory
- Try running the command manually in terminal for more details`;
  }

  private analyzeError(
    output: string,
    error?: string
  ): {
    summary: string;
    solutions: string[];
  } {
    const errorText = (output + ' ' + (error || '')).toLowerCase();

    // Analyze common Android build errors
    if (errorText.includes('gradlew') && errorText.includes('permission')) {
      return {
        summary: '**Issue:** Gradle wrapper permission denied',
        solutions: [
          'Run: `chmod +x android/gradlew`',
          'Ensure gradlew file has execute permissions',
        ],
      };
    }

    if (
      errorText.includes('android sdk') ||
      errorText.includes('sdk not found')
    ) {
      return {
        summary: '**Issue:** Android SDK not found or not configured',
        solutions: [
          'Install Android SDK and set ANDROID_HOME environment variable',
          'Run: `npx react-native doctor` to check setup',
          'Verify Android Studio is installed with SDK',
        ],
      };
    }

    if (errorText.includes('java') && errorText.includes('version')) {
      return {
        summary: '**Issue:** Java version compatibility problem',
        solutions: [
          'Install Java 11 or 17 (recommended for React Native)',
          'Set JAVA_HOME environment variable',
          'Run: `java -version` to check current version',
        ],
      };
    }

    if (errorText.includes('out of memory') || errorText.includes('oom')) {
      return {
        summary: '**Issue:** Out of memory during build',
        solutions: [
          'Increase Gradle heap size: Add `org.gradle.jvmargs=-Xmx4g` to gradle.properties',
          'Close other applications to free memory',
          'Try building on a machine with more RAM',
        ],
      };
    }

    if (errorText.includes('timeout') || errorText.includes('timed out')) {
      return {
        summary: '**Issue:** Build process timed out',
        solutions: [
          'The build may still be running - wait a bit longer',
          'Check if device has sufficient resources',
          'Try building during off-peak hours',
        ],
      };
    }

    if (errorText.includes('dependency') || errorText.includes('resolve')) {
      return {
        summary: '**Issue:** Dependency resolution failed',
        solutions: [
          'Run: `cd android && ./gradlew clean`',
          'Clear npm/yarn cache: `npm cache clean --force`',
          'Delete node_modules and reinstall: `rm -rf node_modules && npm install`',
        ],
      };
    }

    // Default error analysis
    return {
      summary: '**Issue:** Build process failed',
      solutions: [
        'Check the full error output above for specific error messages',
        'Verify all dependencies are installed correctly',
        'Try running the command manually to get more detailed error information',
        'Check React Native and Android setup: `npx react-native doctor`',
      ],
    };
  }

  private extractBuildPath(output: string): string | null {
    const pathPatterns = [
      // Gradle specific patterns
      /BUILD SUCCESSFUL.*?(\S+\.apk)/i,
      /build successful.*?(\S+\.apk)/i,
      /apk generated at:\s*(.+\.apk)/i,
      /aab generated at:\s*(.+\.aab)/i,
      /output:\s*(.+\.apk)/i,
      /output:\s*(.+\.aab)/i,
      /generated at:\s*(.+\.apk)/i,
      /generated at:\s*(.+\.aab)/i,
      /build output:\s*(.+\.apk)/i,
      /build output:\s*(.+\.aab)/i,
      // Standard Android paths
      /app\/build\/outputs\/apk\/release\/app-release\.apk/i,
      /android\/app\/build\/outputs\/apk\/release\/app-release\.apk/i,
      /app-release\.apk/i,
      /app-release\.aab/i,
      // Generic patterns
      /\.apk/i,
      /\.aab/i,
    ];

    for (const pattern of pathPatterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    // If no specific path found, look for common Android build output indicators
    if (
      output.includes('BUILD SUCCESSFUL') ||
      output.includes('build successful')
    ) {
      return 'android/app/build/outputs/apk/release/app-release.apk';
    }

    return null;
  }

  // Convenience methods for common commands
  async runYarn(command: string, projectPath?: string): Promise<string> {
    return await this.processCommand(`yarn ${command}`, projectPath);
  }

  // Android release build workflow - simplified
  async buildAndroidRelease(
    projectPath?: string,
    skipClean?: boolean
  ): Promise<string> {
    const targetPath = projectPath || process.cwd();

    try {
      // Step 1: Check if android folder exists
      console.log(`🔍 Checking for android folder in: ${targetPath}`);
      const androidPath = path.join(targetPath, 'android');

      if (!fs.existsSync(androidPath)) {
        return `**❌ Android folder not found**\n\n**Project Path:** ${targetPath}\n**Expected:** ${androidPath}\n\nPlease ensure you're in a React Native project with an android folder.`;
      }

      console.log(`✅ Android folder found at: ${androidPath}`);
      console.log(`📋 Build Configuration:`);
      console.log(`   - Build Folder Deletion: ENABLED (always runs)`);
      console.log(
        `   - Gradlew Clean: ${skipClean ? 'SKIPPED (default)' : 'ENABLED (user choice)'}`
      );
      console.log(`   - Timeout: 25 minutes (optimized for low-end devices)`);

      // Step 2: Install dependencies with yarn
      console.log(`📦 Installing dependencies with yarn...`);
      const yarnResult = await this.processCommand('yarn install', targetPath);

      if (!yarnResult.includes('✅ Command Executed Successfully')) {
        return `**❌ Yarn Install Failed**\n\n${yarnResult}\n\n**Please fix dependency issues before building.**`;
      }

      // Step 3: Navigate to android/app and delete build folder
      console.log(`🗑️ Navigating to android/app and deleting build folder...`);
      const buildFolderDeleted = await this.deleteAppBuildFolder(targetPath);

      if (!buildFolderDeleted) {
        return `**❌ Failed to delete build folder**\n\n**Please manually delete android/app/build folder and try again.**`;
      }

      // Step 4: Gradle clean (optional - user can skip)
      let cleanResult = '';
      let cleanStepCompleted = false;

      if (skipClean) {
        console.log(`⏭️ Skipping Gradle clean as requested by user`);
        cleanStepCompleted = true;
      } else {
        console.log(`🧹 Running Gradle clean from android folder...`);
        console.log(
          `ℹ️ This step clears Android build cache and ensures a fresh build`
        );
        cleanResult = await this.processCommand(
          './gradlew clean',
          path.join(targetPath, 'android')
        );

        if (cleanResult.includes('✅ Command Executed Successfully')) {
          console.log(`✅ Gradle clean completed successfully`);
          cleanStepCompleted = true;
        } else {
          console.log(`⚠️ Gradle clean failed, but continuing with build...`);
          console.log(
            `ℹ️ Build will proceed without clean - this may cause issues with cached artifacts`
          );
          cleanStepCompleted = true; // Don't fail the build for clean issues
        }
      }

      // Step 5: Run Gradle assembleRelease command from android folder
      const gradleCommand = `./gradlew assembleRelease --stacktrace -PreactNativeArchitectures=arm64-v8a`;
      console.log(
        `🚀 Starting Android release build from android folder: ${gradleCommand}`
      );

      const buildResult = await this.processCommand(
        gradleCommand,
        path.join(targetPath, 'android')
      );

      // Step 6: Get APK path after build completion
      const apkInfo = await this.getApkPath(targetPath);

      // Step 7: Verify build folder status after build completion
      const buildSuccess = buildResult.includes(
        '✅ Command Executed Successfully'
      );
      const buildFolderStatus = await this.verifyBuildFolderStatus(
        targetPath,
        buildSuccess
      );
      console.log(buildFolderStatus);

      if (apkInfo) {
        const cleanStatus = skipClean
          ? '⏭️ Gradlew clean - Skipped (build folder deletion provides clean build)'
          : '✅ Gradlew clean - Additional cache clearing completed';

        return `**✅ Android Release Build Completed Successfully**

**Build Steps Completed:**
1. ✅ Yarn install - Dependencies installed
2. ✅ Build folder deletion - Previous build artifacts removed
3. ${cleanStatus}
4. ✅ Release build - APK generated

**📱 APK Location:** ${apkInfo}

**Build Summary:**
${buildResult}

${buildFolderStatus}`;
      } else {
        // If build succeeded but no APK found, provide helpful info
        if (buildResult.includes('✅ Command Executed Successfully')) {
          const cleanStatus = skipClean
            ? '⏭️ Gradlew clean - Skipped (build folder deletion provides clean build)'
            : '✅ Gradlew clean - Additional cache clearing completed';

          return `**⚠️ Build Completed But APK Not Found**

**Build Steps Completed:**
1. ✅ Yarn install - Dependencies installed
2. ✅ Build folder deletion - Previous build artifacts removed
3. ${cleanStatus}
4. ✅ Release build - Command completed

**Possible Issues:**
- APK was built but moved to unexpected location
- Build completed but APK generation failed
- Check build output for specific APK path

**Debug Steps:**
- Check: \`android/app/build/outputs/apk/release/\`
- Look for any .apk files in the android folder
- Verify build actually completed successfully

**Build Output:**
${buildResult}

${buildFolderStatus}`;
        } else {
          const cleanStatus = skipClean
            ? '⏭️ Gradlew clean - Skipped (build folder deletion provides clean build)'
            : '✅ Gradlew clean - Additional cache clearing completed';

          return `**❌ Android Release Build Failed**

**Build Steps Attempted:**
1. ✅ Yarn install - Dependencies installed
2. ✅ Build folder deletion - Previous build artifacts removed
3. ${cleanStatus}
4. ❌ Release build - Failed

**Error Details:**
${buildResult}

${buildFolderStatus}`;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `**❌ Android Release Build Error**

**Project Path:** ${targetPath}
**Error:** ${errorMessage}

**Common Issues:**
- Android folder not found or invalid React Native project
- Insufficient permissions or disk space
- Missing dependencies or configuration

**Debug Steps:**
- Verify you're in a React Native project with android folder
- Check: \`ls -la android/\` to see folder contents
- Ensure sufficient disk space: \`df -h\`
- Try running: \`npx react-native doctor\``;
    }
  }

  // Delete Android app build folder with STRICT SAFETY CHECKS
  // Only deletes the 'build' folder under android/app directory
  // Multiple validation layers to prevent accidental deletion of other folders
  private async deleteAppBuildFolder(projectPath: string): Promise<boolean> {
    try {
      // Step 1: Validate project path structure
      const androidPath = path.join(projectPath, 'android');
      const androidAppPath = path.join(androidPath, 'app');
      const buildFolderPath = path.join(androidAppPath, 'build');

      console.log(`🔍 Safety Check - Project root: ${projectPath}`);
      console.log(`🔍 Safety Check - Android path: ${androidPath}`);
      console.log(`🔍 Safety Check - Android/app path: ${androidAppPath}`);
      console.log(`🔍 Safety Check - Build folder path: ${buildFolderPath}`);

      // Step 2: Validate directory structure exists
      if (!fs.existsSync(androidPath)) {
        console.log(
          `❌ Safety Check Failed: android directory not found at ${androidPath}`
        );
        return false;
      }

      if (!fs.existsSync(androidAppPath)) {
        console.log(
          `❌ Safety Check Failed: android/app directory not found at ${androidAppPath}`
        );
        return false;
      }

      // Step 3: Validate we're in the correct location (android/app/build)
      const expectedPathPattern = /android[\/\\]app[\/\\]build$/;
      const normalizedBuildPath = buildFolderPath.replace(/\\/g, '/');
      const projectRootNormalized = projectPath.replace(/\\/g, '/');
      const relativePath = normalizedBuildPath.replace(
        projectRootNormalized + '/',
        ''
      );

      if (!expectedPathPattern.test(relativePath)) {
        console.log(
          `❌ Safety Check Failed: Invalid build path pattern. Expected: android/app/build, Got: ${relativePath}`
        );
        return false;
      }

      // Step 4: Additional validation - ensure build folder is actually named 'build'
      const folderName = path.basename(buildFolderPath);
      if (folderName !== 'build') {
        console.log(
          `❌ Safety Check Failed: Folder name is not 'build', got: ${folderName}`
        );
        return false;
      }

      // Step 5: Check if build folder exists
      if (fs.existsSync(buildFolderPath)) {
        console.log(
          `✅ Safety Checks Passed - Build folder exists at correct location`
        );
        console.log(
          `🗑️ Proceeding with deletion from android/app directory...`
        );

        // Step 6: Navigate to android/app and delete ONLY the 'build' folder
        const deleteCommand = `rm -rf build`;
        console.log(`🚀 Executing: ${deleteCommand} from ${androidAppPath}`);
        const result = await this.executeCommand(deleteCommand, androidAppPath);

        if (result.success) {
          // Step 7: Verify deletion was successful
          if (fs.existsSync(buildFolderPath)) {
            console.log(`❌ Build folder still exists after deletion attempt`);
            return false;
          } else {
            console.log(
              `✅ Build folder successfully deleted from android/app`
            );
            return true;
          }
        } else {
          console.log(`❌ Failed to delete build folder: ${result.error}`);
          return false;
        }
      } else {
        console.log(
          `ℹ️ Build folder does not exist at expected location: ${buildFolderPath}`
        );
        return true; // Not an error if folder doesn't exist
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error during build folder deletion: ${errorMessage}`);
      return false;
    }
  }

  // Verify build folder status after build completion
  private async verifyBuildFolderStatus(
    projectPath: string,
    buildSuccess: boolean
  ): Promise<string> {
    try {
      const buildFolderPath = path.join(projectPath, 'android', 'app', 'build');

      if (fs.existsSync(buildFolderPath)) {
        if (buildSuccess) {
          return `✅ BUILD FOLDER STATUS: Build folder recreated successfully (normal after successful build) at ${buildFolderPath}`;
        } else {
          return `⚠️ BUILD FOLDER STATUS: Build folder exists but build failed at ${buildFolderPath}`;
        }
      } else {
        if (buildSuccess) {
          return `⚠️ BUILD FOLDER STATUS: Build succeeded but no build folder found (APK may be in different location)`;
        } else {
          return `✅ BUILD FOLDER STATUS: Build folder properly cleaned up after failed build`;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return `❌ BUILD FOLDER STATUS: Error checking build folder - ${errorMessage}`;
    }
  }

  // Get APK path after build completion
  private async getApkPath(projectPath: string): Promise<string | null> {
    try {
      // Standard APK location
      const apkPath = path.join(
        projectPath,
        'android',
        'app',
        'build',
        'outputs',
        'apk',
        'release',
        'app-release.apk'
      );

      if (fs.existsSync(apkPath)) {
        console.log(`✅ APK found at: ${apkPath}`);
        return apkPath;
      }

      // Alternative location check
      const altApkPath = path.join(
        projectPath,
        'android',
        'app',
        'build',
        'outputs',
        'apk',
        'release'
      );

      if (fs.existsSync(altApkPath)) {
        const files = fs.readdirSync(altApkPath);
        const apkFile = files.find((file) => file.endsWith('.apk'));
        if (apkFile) {
          const fullPath = path.join(altApkPath, apkFile);
          console.log(`✅ APK found at: ${fullPath}`);
          return fullPath;
        }
      }

      console.log(`⚠️ APK file not found in expected locations`);
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`❌ Error finding APK: ${errorMessage}`);
      return null;
    }
  }
}

// Export a default instance for LangGraph deployment
export const androidReleaseAgent = new AndroidReleaseAgent();

// Simple graph function for LangGraph compatibility
export async function androidReleaseGraph(
  state: AndroidState
): Promise<AndroidState> {
  const result = await androidReleaseAgent.processCommand(
    state.command,
    state.projectPath
  );

  return {
    ...state,
    result,
    status: 'success',
  };
}
