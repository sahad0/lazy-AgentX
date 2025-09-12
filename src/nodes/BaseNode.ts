// nodes/BaseNode.ts - Base class for all workflow nodes

import type {
  NodeDefinition,
  NodeExecuteResult,
  WorkflowData,
  WorkflowNode,
} from '../types/index.js';

export abstract class BaseNode {
  protected node: WorkflowNode;
  protected credentials: Record<string, any>;

  constructor(node: WorkflowNode, credentials: Record<string, any> = {}) {
    this.node = node;
    this.credentials = credentials;
  }

  abstract getDefinition(): NodeDefinition;
  abstract execute(inputData: WorkflowData): Promise<NodeExecuteResult>;

  protected getParameter(name: string, defaultValue?: any): any {
    return this.node.parameters[name] ?? defaultValue;
  }

  protected getCredential(name: string): any {
    return this.credentials[name];
  }

  protected createSuccessResult(data: WorkflowData): NodeExecuteResult {
    return {
      success: true,
      data,
    };
  }

  protected createErrorResult(error: string): NodeExecuteResult {
    return {
      success: false,
      error,
    };
  }

  protected validateRequiredParameters(requiredParams: string[]): void {
    for (const param of requiredParams) {
      if (!this.node.parameters[param]) {
        throw new Error(`Required parameter '${param}' is missing`);
      }
    }
  }

  protected validateRequiredCredentials(requiredCreds: string[]): void {
    for (const cred of requiredCreds) {
      if (!this.credentials[cred]) {
        throw new Error(`Required credential '${cred}' is missing`);
      }
    }
  }
}
