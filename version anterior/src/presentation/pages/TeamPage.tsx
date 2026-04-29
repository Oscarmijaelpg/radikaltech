import React, { useState } from 'react';
import AnkorImg from '../../media/ankor.webp';
import IndexaImg from '../../media/indexa.webp';
import SiraImg from '../../media/Sira.webp';
import NexoImg from '../../media/Nexo.webp';
import KronosImg from '../../media/Kronos.webp';
import clsx from 'clsx';
import { ArchiveHeader } from '../components/layout/ArchiveHeader';
import { AddKnowledgeModal } from '../components/chat/AddKnowledgeModal';


const teamMembers = [
    {
        name: 'Ankor',
        role: 'Guía de Onboarding',
        description: 'Ankor es tu punto de partida. Experto en bienvenida y acompañamiento inicial, su misión es que te sientas como en casa desde el primer minuto. Con una paciencia infinita y una guía estructurada, te ayudará a configurar tu presencia en Radikal IA, asegurando que cada detalle de tu marca esté integrado y listo para la acción.',
        expertise: 'Gestión de Onboarding, Configuración de Marca, Experiencia de Usuario Inicial y Guía de Plataforma.',
        image: AnkorImg,
        color: 'from-emerald-400 to-emerald-600',
        glowColor: 'rgba(52, 211, 153, 0.5)',
        icon: 'waving_hand'
    },
    {
        name: 'Indexa',
        role: 'Especialista SEO',
        description: 'Nuestra analista de búsqueda de profundidad. Indexa vive entre algoritmos y estructuras web. Se encarga de rastrear tu sitio y el de tu competencia con una visión de rayos X, identificando oportunidades de posicionamiento que otros pasan por alto. Si existe un hueco para mejorar tu visibilidad, ella lo encontrará.',
        expertise: 'Auditoría SEO Técnica, Análisis de Palabras Clave, Rastreo de Competencia Web y Salud de Dominio.',
        image: IndexaImg,
        color: 'from-blue-400 to-blue-600',
        glowColor: 'rgba(96, 165, 250, 0.5)',
        icon: 'search'
    },
    {
        name: 'Sira',
        role: 'Analista de Mercado',
        description: 'Sira es la inteligencia competitiva pura. Analiza tendencias globales y locales con una visión crítica y estratégica. No solo mira lo que hace tu competencia hojeando sus informes, sino que descifra sus intenciones. Te ofrece insights resumidos y directos para que tus decisiones corporativas siempre tengan una base sólida.',
        expertise: 'Inteligencia Competitiva, Análisis de Tendencias, Visión Crítica de Mercado e Informes Estratégicos.',
        image: SiraImg,
        color: 'from-amber-400 to-amber-600',
        glowColor: 'rgba(251, 191, 36, 0.5)',
        icon: 'insights'
    },
    {
        name: 'Nexo',
        role: 'Estratega Creativo',
        description: 'El motor creativo y visual de tu equipo. Nexo diseña estrategias de marketing que no solo se ven bien, sino que venden. Desde la creación de copys persuasivos hasta la generación de activos digitales de alto impacto, Nexo eleva el valor de tu marca convirtiendo ideas abstractas en resultados visuales y narrativos potentes.',
        expertise: 'Marketing Creativo, Generación de Copys, Diseño de Activos Visuales y Estrategia de Marca.',
        image: NexoImg,
        color: 'from-purple-400 to-purple-600',
        glowColor: 'rgba(167, 139, 250, 0.5)',
        icon: 'auto_awesome'
    },
    {
        name: 'Kronos',
        role: 'Ejecutor de Tareas',
        description: 'Especialista en ejecución masiva y eficiencia. Kronos es quien transforma los datos primarios en informes estructurados y profesionales. Maneja procesos complejos con una precisión quirúrgica, asegurando que todos los reportes y tareas se cumplan en tiempo récord sin sacrificar nunca la calidad o el detalle.',
        expertise: 'Automatización de Tareas, Estructuración de Informes, Procesamiento de Datos y Eficiencia Operativa.',
        image: KronosImg,
        color: 'from-rose-400 to-rose-600',
        glowColor: 'rgba(251, 113, 133, 0.5)',
        icon: 'bolt'
    }
];

export const TeamPage: React.FC = () => {
    const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(2);
    const [isFlipped, setIsFlipped] = useState(false);

    const handleNext = () => {
        setIsFlipped(false);
        setActiveIndex((prev) => (prev + 1) % teamMembers.length);
    };

    const handlePrev = () => {
        setIsFlipped(false);
        setActiveIndex((prev) => (prev - 1 + teamMembers.length) % teamMembers.length);
    };

    const handleCardClick = (index: number) => {
        if (index === activeIndex) {
            setIsFlipped(!isFlipped);
        } else {
            setActiveIndex(index);
            setIsFlipped(false);
        }
    };


    return (
        <div className="flex-1 flex flex-col bg-slate-50 m-2 rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-1rem)] relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>

            <ArchiveHeader
                activeTab="team"
                onAddKnowledge={() => setIsAddKnowledgeOpen(true)}
            />

            {/* Main Content Area - Added significant top padding (pt-20) for the pop-out headroom */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden pt-12">
                <div className="relative w-full max-w-5xl h-full flex items-center justify-center perspective-1000">
                    <div className="absolute top-4 right-4 flex gap-2 z-50">
                        <button
                            onClick={handlePrev}
                            className="group w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-[hsl(var(--color-primary))] transition-all active:scale-90 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-slate-600 group-hover:text-[hsl(var(--color-primary))] text-lg">arrow_back_ios_new</span>
                        </button>
                        <button
                            onClick={handleNext}
                            className="group w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:border-[hsl(var(--color-primary))] transition-all active:scale-90 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-slate-600 group-hover:text-[hsl(var(--color-primary))] text-lg">arrow_forward_ios</span>
                        </button>
                    </div>
                    {teamMembers.map((member, index) => {
                        let position = index - activeIndex;
                        if (position > 2) position -= teamMembers.length;
                        if (position < -2) position += teamMembers.length;

                        const isActive = position === 0;
                        const isVisible = Math.abs(position) <= 2;

                        if (!isVisible) return null;

                        return (
                            <div
                                key={member.name}
                                onClick={() => handleCardClick(index)}
                                className={clsx(
                                    "absolute transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer",
                                    isActive ? "z-30 opacity-100" : "z-10 opacity-30 hover:opacity-60 grayscale-[0.5]"
                                )}
                                style={{
                                    transform: `translateX(${position * 200}px) scale(${isActive ? 1 : 0.65}) rotateY(${position * -25}deg)`,
                                    filter: isActive ? 'none' : 'blur(1px)'
                                }}
                            >
                                <div className={clsx(
                                    "w-[280px] h-[400px] transition-all duration-700 preserve-3d relative group/card",
                                    isActive && isFlipped ? "rotate-y-180" : ""
                                )}>
                                    {/* Holographic Border */}
                                    <div className={clsx(
                                        "absolute -inset-[2px] rounded-[24px] bg-gradient-to-br transition-all duration-700 blur-[3px]",
                                        isActive ? "opacity-70" : "opacity-0",
                                        member.color
                                    )}></div>

                                    {/* FRONT SIDE */}
                                    <div className="absolute inset-0 w-full h-full backface-hidden rounded-[22px] overflow-visible perspective-1000">
                                        <div className="absolute inset-0 rounded-[22px] bg-white border border-white/50 shadow-2xl transition-all duration-500 group-hover/card:scale-[0.88] z-10 origin-center">
                                            <div className={clsx("absolute inset-0 opacity-[0.1] bg-gradient-to-b via-transparent to-transparent rounded-[22px]", member.color)}></div>
                                            <div className="absolute top-3 left-3 z-20 flex gap-0.5">
                                                {[1, 2, 3].map(i => <div key={i} className="w-0.5 h-0.5 rounded-full bg-[hsl(var(--color-primary)/0.4)]"></div>)}
                                            </div>
                                            <div className="absolute top-3 right-3 z-20 text-[7px] font-black text-[hsl(var(--color-primary)/0.5)] tracking-[0.2em] uppercase">Status: OK</div>
                                        </div>

                                        <div className="absolute inset-0 flex items-end justify-center pt-8 z-20 overflow-visible pointer-events-none">
                                            <img
                                                src={member.image}
                                                alt={member.name}
                                                className={clsx(
                                                    "w-[85%] h-[85%] object-contain grayscale transition-all duration-700 drop-shadow-2xl",
                                                    isActive ? "group-hover/card:scale-[1.2] group-hover/card:-translate-y-16 group-hover/card:grayscale-0" : ""
                                                )}
                                            />
                                        </div>

                                        <div className="absolute bottom-4 inset-x-4 p-4 rounded-xl bg-black/95 backdrop-blur-md shadow-xl z-30 transition-all duration-500 group-hover/card:scale-[0.92] group-hover/card:-translate-y-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className={clsx("w-1.5 h-1.5 rounded-full", member.color.replace('from-', 'bg-').split(' ')[0])}></div>
                                                <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">{member.name}</h3>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-white/40">{member.role}</span>
                                                <span className="material-symbols-outlined text-[hsl(var(--color-primary))] text-[10px]">login</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* BACK SIDE */}
                                    <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-[22px] bg-slate-900 p-6 border-2 border-[hsl(var(--color-primary)/0.4)] shadow-2xl flex flex-col justify-between overflow-hidden">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg bg-gradient-to-br", member.color)}>
                                                    <span className="material-symbols-outlined text-lg">{member.icon}</span>
                                                </div>
                                                <div className="text-right">
                                                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">{member.name}</h3>
                                                    <span className="text-[6px] font-black uppercase text-[hsl(var(--color-primary))] tracking-widest leading-none block">Intelligence Profile</span>
                                                </div>
                                            </div>

                                            <div className="h-px w-full bg-slate-800/50"></div>

                                            <div className="space-y-3">
                                                <div className="text-left space-y-0.5">
                                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Definición de Función</span>
                                                    <p className="text-[10px] leading-relaxed text-slate-300 font-medium line-clamp-[6]">
                                                        {member.description}
                                                    </p>
                                                </div>
                                                <div className="text-left space-y-0.5">
                                                    <span className="text-[7px] font-black text-[hsl(var(--color-primary))] uppercase tracking-widest">Dominios Maestros</span>
                                                    <p className="text-[11px] leading-tight text-white font-black uppercase tracking-tight">
                                                        {member.expertise}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <button className="py-2.5 rounded-lg bg-[hsl(var(--color-primary))] text-white text-[8px] font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all w-full mt-2">
                                            Volver al Personaje
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Futuristic Indicator */}
            <div className="p-4 flex flex-col items-center gap-2 z-40 bg-white/20 backdrop-blur-md border-t border-slate-200 relative flex-shrink-0">
                <div className="flex gap-1.5">
                    {teamMembers.map((_, i) => (
                        <div
                            key={i}
                            onClick={() => setActiveIndex(i)}
                            className={clsx(
                                "h-[2px] transition-all duration-700 cursor-pointer rounded-full",
                                i === activeIndex ? "w-10 bg-[hsl(var(--color-primary))] shadow-[0_0_8px_rgba(255,20,147,0.4)]" : "w-3 bg-slate-300 hover:bg-slate-400"
                            )}
                        />
                    ))}
                </div>
                <div className="flex items-center gap-4 px-3 py-1 rounded-full border border-slate-200 bg-white/50">
                    <span className="text-[7px] font-black tracking-[0.4em] text-slate-400 uppercase flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                        Neural Interface Sync
                    </span>
                </div>
            </div>
            <AddKnowledgeModal
                isOpen={isAddKnowledgeOpen}
                onClose={() => setIsAddKnowledgeOpen(false)}
            />
        </div>

    );
};
