import { useMemo } from 'react';

export interface StructuredReportData {
  company_name?: string;
  report_date?: string;
  news?: { title?: string; source?: string }[];
  [key: string]: unknown;
}

export function useStructuredData(
  content: string,
  isThinking: boolean,
): StructuredReportData | null {
  return useMemo(() => {
    if (isThinking || !content) return null;
    try {
      const jsonMatch =
        content.match(/<report_data>([\s\S]*?)<\/report_data>/) ||
        content.match(/```json\n([\s\S]*?)\n```/) ||
        content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const rawJson = jsonMatch[1] || jsonMatch[0];
        const data = JSON.parse(rawJson.trim()) as StructuredReportData;
        if (data.company_name || (data.news && Array.isArray(data.news))) {
          return data;
        }
      }
    } catch {
      // not structured data
    }
    return null;
  }, [content, isThinking]);
}
