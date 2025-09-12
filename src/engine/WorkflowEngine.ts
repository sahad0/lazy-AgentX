// engine/WorkflowEngine.ts - Workflow execution engine

import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowData,
  WorkflowNode,
} from '../types/index.js';
import { BaseNode } from '../nodes/BaseNode.js';
import { JiraNode } from '../nodes/jira/JiraNode.js';

type NodeConstructor = new (
  node: WorkflowNode,
  credentials?: Record<string, any>
) => BaseNode;

export class WorkflowEngine {
  private nodeRegistry: Map<string, NodeConstructor> = new Map();

  constructor() {
    this.registerNode('jira', JiraNode);
  }

  registerNode(type: string, nodeClass: NodeConstructor): void {
    this.nodeRegistry.set(type, nodeClass);
  }

  async executeWorkflow(
    workflow: WorkflowDefinition,
    inputData: WorkflowData = {}
  ): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      id: `exec_${Date.now()}`,
      status: 'running',
      startTime: new Date(),
      data: inputData,
    };

    try {
      // Find the start node (node with no incoming connections)
      const startNode = this.findStartNode(workflow);
      if (!startNode) {
        throw new Error('No start node found in workflow');
      }

      // Execute workflow starting from the start node
      const result = await this.executeNodeChain(
        workflow,
        startNode,
        inputData
      );

      execution.status = 'success';
      execution.endTime = new Date();
      execution.data = result;

      return execution;
    } catch (error) {
      execution.status = 'error';
      execution.endTime = new Date();
      execution.error = error instanceof Error ? error.message : String(error);
      return execution;
    }
  }

  private findStartNode(workflow: WorkflowDefinition): WorkflowNode | null {
    // Find a node that has no incoming connections
    const connectedNodes = new Set<string>();

    for (const connections of Object.values(workflow.connections)) {
      for (const connection of connections) {
        connectedNodes.add(connection.node);
      }
    }

    for (const node of workflow.nodes) {
      if (!connectedNodes.has(node.id)) {
        return node;
      }
    }

    return null;
  }

  private async executeNodeChain(
    workflow: WorkflowDefinition,
    currentNode: WorkflowNode,
    inputData: WorkflowData
  ): Promise<WorkflowData> {
    // Create and execute the current node
    const nodeInstance = this.createNodeInstance(currentNode, workflow);
    const result = await nodeInstance.execute(inputData);

    if (!result.success) {
      throw new Error(`Node execution failed: ${result.error}`);
    }

    // Find next nodes to execute
    const nextNodes = this.getNextNodes(workflow, currentNode.id);

    if (nextNodes.length === 0) {
      // End of workflow
      return result.data || {};
    }

    // Execute next nodes (for now, just the first one - can be extended for parallelism)
    const nextNode = nextNodes[0];
    if (!nextNode) {
      return result.data || {};
    }
    return await this.executeNodeChain(workflow, nextNode, result.data || {});
  }

  private getNextNodes(
    workflow: WorkflowDefinition,
    currentNodeId: string
  ): WorkflowNode[] {
    const connections = workflow.connections[currentNodeId] || [];
    const nextNodes: WorkflowNode[] = [];

    for (const connection of connections) {
      const nextNode = workflow.nodes.find(
        (node) => node.id === connection.node
      );
      if (nextNode) {
        nextNodes.push(nextNode);
      }
    }

    return nextNodes;
  }

  private createNodeInstance(
    node: WorkflowNode,
    workflow: WorkflowDefinition
  ): BaseNode {
    const NodeClass = this.nodeRegistry.get(node.type);
    if (!NodeClass) {
      throw new Error(`Unknown node type: ${node.type}`);
    }

    // Extract credentials for this node
    const credentials = this.extractCredentials(node, workflow);

    return new NodeClass(node, credentials);
  }

  private extractCredentials(
    node: WorkflowNode,
    _workflow: WorkflowDefinition
  ): Record<string, any> {
    // Extract credentials from the node definition
    return node.credentials || {};
  }

  getAvailableNodes(): string[] {
    return Array.from(this.nodeRegistry.keys());
  }

  getNodeDefinition(nodeType: string): any {
    const NodeClass = this.nodeRegistry.get(nodeType);
    if (!NodeClass) {
      throw new Error(`Unknown node type: ${nodeType}`);
    }

    // Create a temporary instance to get the definition
    const tempNode = new NodeClass({} as WorkflowNode, {});
    return tempNode.getDefinition();
  }
}
