import { getBrandProfileTool } from './brand-tools.js';
import { analyzeCompetitorTool, getCompetitorDataTool } from './competitor-tools.js';
import { evaluateContentTool, generateImageTool } from './image-tools.js';
import { createRecommendationTool, saveMemoryTool } from './memory-tools.js';
import { findTrendsTool, searchNewsTool } from './news-tools.js';
import { generateReportTool } from './report-tools.js';
import type { ToolDefinition, ToolExecContext, ToolExecResult } from './types.js';
import { analyzeWebsiteTool, detectMarketsTool } from './website-tools.js';

const TOOLS: ToolDefinition[] = [
  analyzeCompetitorTool,
  generateImageTool,
  searchNewsTool,
  saveMemoryTool,
  createRecommendationTool,
  findTrendsTool,
  evaluateContentTool,
  analyzeWebsiteTool,
  detectMarketsTool,
  generateReportTool,
  getCompetitorDataTool,
  getBrandProfileTool,
];

const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.schema.function.name, t]));

export const CHAT_TOOLS = TOOLS.map((t) => t.schema);

export function toolLabel(name: string): string {
  return TOOLS_BY_NAME.get(name)?.label ?? name;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolExecContext,
): Promise<ToolExecResult> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) return { summary: `Tool desconocido: ${name}`, error: 'unknown_tool' };
  try {
    return await tool.execute(args, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[chat-tools] execute error', name, msg);
    return { summary: `Error ejecutando ${name}: ${msg}`, error: msg };
  }
}

export type { ToolExecContext, ToolExecResult } from './types.js';
