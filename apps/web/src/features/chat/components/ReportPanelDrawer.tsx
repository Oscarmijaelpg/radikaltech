import { ReportPanel } from './ReportPanel';

interface Props {
  content: string;
  isThinking: boolean;
  onClose: () => void;
}

export function ReportPanelDrawer({ content, isThinking, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex md:relative md:inset-auto md:z-auto">
      <div className="absolute inset-0 bg-black/40 md:hidden" onClick={onClose} />
      <div className="relative w-full md:w-[480px] lg:w-[560px] shrink-0 h-full">
        <ReportPanel content={content} isThinking={isThinking} onClose={onClose} />
      </div>
    </div>
  );
}
