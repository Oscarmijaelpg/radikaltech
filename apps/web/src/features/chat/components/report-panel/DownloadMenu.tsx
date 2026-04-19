import { useState } from 'react';
import { Icon } from '@radikal/ui';
import { exportToPDF, exportToWord } from '@/shared/utils/exportUtils';
import type { StructuredReportData } from './useStructuredData';

interface Props {
  content: string;
  structuredData: StructuredReportData | null;
}

export function DownloadMenu({ content, structuredData }: Props) {
  const [open, setOpen] = useState(false);

  const handlePDF = async () => {
    setOpen(false);
    const fileName = structuredData?.company_name
      ? `reporte-${structuredData.company_name.toLowerCase().replace(/\s+/g, '-')}.pdf`
      : 'reporte-radikal.pdf';
    await exportToPDF('report-content', fileName, structuredData);
  };

  const handleWord = async () => {
    setOpen(false);
    const title = structuredData?.company_name
      ? `Informe Estratégico - ${structuredData.company_name}`
      : 'Informe Detallado Radikal IA';
    const displayContent = structuredData
      ? `Informe para: ${structuredData.company_name}\nFecha: ${structuredData.report_date}\n\nResumen:\n${
          structuredData.news
            ?.map((item) => `- ${item.title} (${item.source})`)
            .join('\n') ?? ''
        }`
      : content;
    await exportToWord(displayContent, title);
  };

  return (
    <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 relative">
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-[hsl(var(--color-primary))] rounded-xl shadow-lg hover:shadow-[hsl(var(--color-primary)/0.3)] transition-all active:scale-95 min-h-[44px]"
        >
          <Icon name="download" className="text-lg" />
          <span className="hidden sm:inline">Descargar Informe</span>
          <span className="sm:hidden">Descargar</span>
        </button>

        {open && (
          <div className="absolute bottom-full right-0 mb-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <button
              onClick={handlePDF}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors min-h-[44px]"
            >
              <Icon name="picture_as_pdf" className="text-rose-500" />
              Descargar PDF
            </button>
            <button
              onClick={handleWord}
              className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors border-t border-slate-100 min-h-[44px]"
            >
              <Icon name="description" className="text-blue-500" />
              Descargar Word
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
