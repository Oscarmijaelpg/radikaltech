import { DownloadMenu } from './report-panel/DownloadMenu';
import { ReportMarkdown } from './report-panel/ReportMarkdown';
import { ReportPanelEmpty } from './report-panel/ReportPanelEmpty';
import { ReportPanelFinishedFooter } from './report-panel/ReportPanelFinishedFooter';
import { ReportPanelHeader } from './report-panel/ReportPanelHeader';
import { useStructuredData } from './report-panel/useStructuredData';

interface Props {
  content: string;
  isThinking: boolean;
  onClose: () => void;
}

export function ReportPanel({ content, isThinking, onClose }: Props) {
  const structuredData = useStructuredData(content, isThinking);

  return (
    <div className="w-full flex flex-col bg-slate-50 border-l border-slate-200 animate-in slide-in-from-right duration-500 overflow-hidden h-full">
      <ReportPanelHeader isThinking={isThinking} onClose={onClose} />

      <div className="flex-1 overflow-y-auto bg-white">
        <div
          id="report-content"
          className="w-full max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12 md:px-12 md:py-20"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8 sm:mb-12 border-b border-slate-100 pb-6 sm:pb-8">
            <div className="flex flex-col gap-1">
              <div className="text-2xl sm:text-3xl font-black text-slate-900">
                RADIKAL<span className="text-[hsl(var(--color-primary))]">IA</span>
              </div>
              <p className="text-[10px] font-black tracking-[0.2em] text-[hsl(var(--color-primary))] mt-1 uppercase">
                Inteligencia Estratégica
              </p>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-[10px] uppercase tracking-widest font-black text-slate-400 mb-1">
                Análisis Radikal IA
              </div>
              <div className="text-[12px] font-bold text-slate-600">
                {new Date().toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {content ? (
            <ReportMarkdown content={content} structuredData={structuredData} />
          ) : (
            <ReportPanelEmpty />
          )}
        </div>

        {!isThinking && content && <ReportPanelFinishedFooter />}
      </div>

      {!isThinking && content && (
        <DownloadMenu content={content} structuredData={structuredData} />
      )}
    </div>
  );
}
