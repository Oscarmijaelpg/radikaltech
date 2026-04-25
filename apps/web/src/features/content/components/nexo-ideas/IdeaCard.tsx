import { Button, Card, Icon } from '@radikal/ui';
import type { ContentIdea } from './api';

const PLATFORM_STYLES: Record<ContentIdea['platform'], string> = {
  Instagram: 'bg-gradient-to-r from-pink-500 to-purple-500 text-white',
  LinkedIn: 'bg-blue-600 text-white',
  Twitter: 'bg-slate-800 text-white',
  TikTok: 'bg-black text-white',
};

interface Props {
  idea: ContentIdea;
  onOpen: () => void;
  onGenerateImage: () => void;
}

export function IdeaCard({ idea, onOpen, onGenerateImage }: Props) {
  const platformClass = PLATFORM_STYLES[idea.platform];
  return (
    <Card className="p-5 flex flex-col gap-3 border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${platformClass}`}>
          {idea.platform}
        </span>
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-700">
          {idea.type === 'carrusel' ? `Carrusel · ${idea.image_count} img` : idea.type === 'historia' ? 'Historia · 1 img' : 'Post · 1 img'}
        </span>
      </div>

      <h3 className="font-display font-semibold text-slate-900 leading-snug">{idea.title}</h3>

      <p className="text-sm text-slate-600 leading-relaxed line-clamp-4 whitespace-pre-wrap">
        {idea.description}
      </p>

      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={onOpen}>
          <Icon name="visibility" className="text-[16px]" />
          Ver detalle
        </Button>
        <Button size="sm" onClick={onGenerateImage}>
          <Icon name="auto_awesome" className="text-[16px]" />
          Generar imagen
        </Button>
      </div>
    </Card>
  );
}
