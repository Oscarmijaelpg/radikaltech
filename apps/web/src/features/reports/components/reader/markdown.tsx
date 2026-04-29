import type { Components } from 'react-markdown';

export const markdownComponents: Components = {
  h1: (props) => (
    <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight mt-6 mb-3 text-slate-900" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-xl md:text-2xl font-display font-black tracking-tight mt-8 mb-3 text-slate-900" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-lg md:text-xl font-bold mt-6 mb-2 text-slate-800" {...props} />
  ),
  h4: (props) => (
    <h4 className="text-base font-bold mt-5 mb-2 text-slate-800" {...props} />
  ),
  p: (props) => (
    <p className="text-sm md:text-base leading-relaxed text-slate-700 mb-4" {...props} />
  ),
  ul: (props) => <ul className="list-disc pl-5 space-y-1.5 mb-4 text-slate-700" {...props} />,
  ol: (props) => <ol className="list-decimal pl-5 space-y-1.5 mb-4 text-slate-700" {...props} />,
  li: (props) => <li className="text-sm md:text-base leading-relaxed" {...props} />,
  strong: (props) => <strong className="font-bold text-slate-900" {...props} />,
  em: (props) => <em className="italic" {...props} />,
  a: ({ href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-violet-700 hover:underline font-semibold"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote className="border-l-4 border-violet-400 bg-violet-50/50 pl-4 py-2 my-4 italic text-slate-700" {...props} />
  ),
  code: ({ className, children, ...props }: React.ComponentProps<'code'>) => {
    const isBlock = /language-/.test(className ?? '');
    if (isBlock) {
      return (
        <code className="block bg-slate-900 text-slate-100 rounded-lg p-3 text-xs overflow-x-auto my-3" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[0.9em] font-mono" {...props}>
        {children}
      </code>
    );
  },
  table: (props) => (
    <div className="my-8 overflow-x-auto rounded-[24px] border border-slate-200/60 bg-white shadow-xl shadow-slate-200/20">
      <table className="w-full border-collapse text-sm text-slate-700 min-w-[600px]" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead className="bg-slate-50/80 backdrop-blur-sm" {...props} />
  ),
  th: (props) => (
    <th className="px-6 py-4 text-left font-display font-black text-slate-900 border-b-2 border-slate-200 uppercase tracking-wider text-[11px]" {...props} />
  ),
  td: (props) => (
    <td className="px-6 py-4 border-b border-slate-100 align-top leading-relaxed" {...props} />
  ),
  tr: (props) => (
    <tr className="hover:bg-slate-50/50 transition-colors last:border-0" {...props} />
  ),
  hr: () => <hr className="my-6 border-slate-200" />,
};
