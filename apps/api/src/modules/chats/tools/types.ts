export interface ToolExecContext {
  userId: string;
  projectId: string | null;
  chatId: string;
}

export interface ToolExecResult {
  summary: string;
  data?: unknown;
  error?: string;
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ToolDefinition {
  schema: ToolSchema;
  label: string;
  execute: (args: Record<string, unknown>, ctx: ToolExecContext) => Promise<ToolExecResult>;
}
