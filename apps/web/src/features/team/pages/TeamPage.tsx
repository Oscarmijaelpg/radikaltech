import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@radikal/ui';
import { cn } from '@/shared/utils/cn';
import { AGENTS } from '../data';

export function TeamPage() {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [flipKey, setFlipKey] = useState(0);
  const [compareOpen, setCompareOpen] = useState(false);

  const agent = AGENTS[index]!;

  const goTo = (next: number) => {
    const wrapped = (next + AGENTS.length) % AGENTS.length;
    setIndex(wrapped);
    setFlipKey((k) => k + 1);
  };

  const talkTo = () => {
    navigate(`/chat?agent=${agent.id}`);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-pink-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="text-center mb-10">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
            Tu equipo de inteligencia artificial
          </p>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-display font-black tracking-tight text-slate-900">
            Conoce a tu equipo de IA
          </h1>
          <p className="text-slate-600 mt-3 sm:mt-4 text-base sm:text-lg max-w-2xl mx-auto px-2">
            Cinco especialistas únicos trabajando en tu marca, cada uno experto en su dominio, todos
            conectados por una única misión: hacerte crecer.
          </p>
          <div className="mt-6">
            <Button variant="outline" onClick={() => setCompareOpen(true)}>
              <span className="material-symbols-outlined text-[18px]">help</span>
              ¿Qué hace cada agente?
            </Button>
          </div>
        </header>

        <div className="relative">
          {/* Arrows */}
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Agente anterior"
            className="absolute -left-2 sm:left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-xl border border-slate-200 grid place-items-center text-slate-700 hover:bg-slate-50 hover:scale-105 transition-all md:-left-4"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Agente siguiente"
            className="absolute -right-2 sm:right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white shadow-xl border border-slate-200 grid place-items-center text-slate-700 hover:bg-slate-50 hover:scale-105 transition-all md:-right-4"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>

          {/* Card */}
          <Card
            key={flipKey}
            className={cn(
              'relative overflow-hidden p-0 border-0 shadow-2xl rounded-[32px]',
              'animate-[teamFlip_0.5s_ease-out]',
              agent.glow,
            )}
            style={{ boxShadow: '0 25px 60px -15px rgba(0,0,0,0.18)' }}
          >
            <div
              className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', agent.color)}
              aria-hidden="true"
            />
            <div className="relative grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 sm:gap-8 p-4 sm:p-8 md:p-10">
              {/* Image */}
              <div className="flex justify-center md:justify-start">
                <div
                  className={cn(
                    'relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] md:w-[320px] md:h-[320px] rounded-[24px] sm:rounded-[28px] overflow-hidden',
                    'bg-gradient-to-br shadow-2xl',
                    agent.color,
                  )}
                >
                  <img
                    src={agent.image}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col">
                <Badge
                  className={cn(
                    'self-start bg-gradient-to-r text-white border-0 text-[11px] uppercase tracking-wider font-black px-3 py-1',
                    agent.color,
                  )}
                >
                  {agent.role}
                </Badge>
                <h2 className="mt-4 text-3xl sm:text-5xl md:text-6xl font-display font-black tracking-tight text-slate-900">
                  {agent.name}
                </h2>
                <p className="mt-4 text-slate-700 text-base md:text-lg leading-relaxed">
                  {agent.description}
                </p>

                <div className="mt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                    Expertise
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agent.expertise.map((e) => (
                      <li key={e} className="flex items-start gap-2 text-sm text-slate-700">
                        <span
                          className={cn(
                            'material-symbols-outlined text-[18px] bg-gradient-to-br bg-clip-text text-transparent',
                            agent.color,
                          )}
                        >
                          check_circle
                        </span>
                        <span>{e}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <blockquote
                  className={cn(
                    'mt-6 p-4 rounded-2xl border-l-4 bg-white/70 backdrop-blur-sm italic text-slate-700',
                    'border-transparent',
                  )}
                  style={{
                    borderImage: undefined,
                  }}
                >
                  <p className="text-sm md:text-base">
                    <span className="text-2xl leading-none mr-1 text-slate-400">“</span>
                    {agent.example}
                    <span className="text-2xl leading-none ml-1 text-slate-400">”</span>
                  </p>
                </blockquote>

                <div className="mt-8">
                  <Button
                    onClick={talkTo}
                    className={cn(
                      'bg-gradient-to-r text-white border-0 hover:opacity-95 px-6 h-12 text-base',
                      agent.color,
                    )}
                  >
                    <span className="material-symbols-outlined text-[20px]">forum</span>
                    Hablar con {agent.name}
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-8">
            {AGENTS.map((a, i) => (
              <button
                key={a.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver ${a.name}`}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i === index
                    ? cn('w-10 bg-gradient-to-r', a.color)
                    : 'w-2.5 bg-slate-300 hover:bg-slate-400',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>¿Qué hace cada agente?</DialogTitle>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-3 font-black uppercase text-[10px] tracking-widest text-slate-500">
                    Agente
                  </th>
                  <th className="text-left p-3 font-black uppercase text-[10px] tracking-widest text-slate-500">
                    Rol
                  </th>
                  <th className="text-left p-3 font-black uppercase text-[10px] tracking-widest text-slate-500">
                    Cuándo usarlo
                  </th>
                  <th className="text-left p-3 font-black uppercase text-[10px] tracking-widest text-slate-500">
                    Ejemplo de pregunta
                  </th>
                </tr>
              </thead>
              <tbody>
                {AGENTS.map((a) => (
                  <tr key={a.id} className="border-t border-slate-100 align-top">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-8 h-8 rounded-lg bg-gradient-to-br shrink-0',
                            a.color,
                          )}
                        />
                        <span className="font-display font-black">{a.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-slate-700">{a.role}</td>
                    <td className="p-3 text-slate-600 text-xs leading-relaxed">
                      {a.expertise.slice(0, 3).join(' · ')}
                    </td>
                    <td className="p-3 text-slate-600 italic text-xs leading-relaxed">
                      "{a.example}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes teamFlip {
          0% { opacity: 0; transform: rotateY(8deg) translateY(8px); }
          100% { opacity: 1; transform: rotateY(0) translateY(0); }
        }
      `}</style>
    </div>
  );
}
