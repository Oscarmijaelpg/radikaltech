import { Badge, Card } from '@radikal/ui';
import type { BrandProfile } from '../../api/memory';
import { Row, SectionTitle } from './shared';

export function BrandIdentitySection({ brand }: { brand: BrandProfile | null | undefined }) {
  return (
    <div className="space-y-6">
      <Card className="p-4 sm:p-6 bg-white space-y-5">
        <SectionTitle icon="auto_awesome">Esencia y propósito</SectionTitle>
        <Row label="Esencia" icon="diamond" value={brand?.essence} />
        <Row label="Misión" icon="flag" value={brand?.mission} />
        <Row label="Visión" icon="visibility" value={brand?.vision} />
      </Card>

      <Card className="p-4 sm:p-6 bg-gradient-to-br from-pink-50 to-cyan-50 space-y-5 border-white">
        <SectionTitle icon="favorite">Valores y personalidad</SectionTitle>
        {brand?.brand_values && brand.brand_values.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {brand.brand_values.map((v, i) => (
              <span
                key={i}
                className={`px-4 py-2 rounded-2xl text-sm font-black uppercase tracking-wider text-white shadow-md ${
                  i % 2 === 0
                    ? 'bg-gradient-to-r from-pink-500 to-pink-600'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600'
                }`}
              >
                {v}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-slate-400">Sin valores definidos</p>
        )}
        {brand?.keywords && brand.keywords.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
              Keywords
            </p>
            <div className="flex flex-wrap gap-1.5">
              {brand.keywords.map((k, i) => (
                <Badge key={i} variant="outline">
                  {k}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-4 sm:p-6 bg-white">
        <SectionTitle icon="groups">Audiencia objetivo</SectionTitle>
        {brand?.target_audience ? (
          <p className="text-sm text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
            {brand.target_audience}
          </p>
        ) : (
          <p className="text-xs italic text-slate-400">
            Aún no has definido tu audiencia
          </p>
        )}
      </Card>
    </div>
  );
}
