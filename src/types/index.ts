// types/index.ts - Core type definitions for workflow system

export type WorkflowData = Record<string, any>;

export type WorkflowStatus = 'running' | 'success' | 'error' | 'cancelled';

export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

export interface WorkflowExecution {
  id: string;
  status: WorkflowStatus;
  startTime: Date;
  endTime?: Date;
  data: WorkflowData;
  error?: string;
}

export interface NodeExecuteResult {
  success: boolean;
  data?: WorkflowData;
  error?: string;
}

export interface NodeProperty {
  displayName: string;
  name: string;
  type: string;
  default?: any;
  required?: boolean;
  description?: string;
  options?: Array<{ name: string; value: string }>;
}

export interface CredentialDefinition {
  name: string;
  displayName: string;
  properties: NodeProperty[];
}

export interface NodeDefinition {
  name: string;
  displayName: string;
  description: string;
  version: number;
  defaults: {
    name: string;
  };
  inputs: string[];
  outputs: string[];
  properties: NodeProperty[];
  credentials?: CredentialDefinition[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, WorkflowConnection[]>;
  active: boolean;
  settings: Record<string, any>;
}
