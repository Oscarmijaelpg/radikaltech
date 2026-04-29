import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/shared/utils/cn';
import { Icon } from '@radikal/ui';
import { processCitations } from './citations';
import type { StructuredReportData } from './useStructuredData';

interface Props {
  content: string;
  structuredData: StructuredReportData | null;
}

export function ReportMarkdown({ content, structuredData }: Props) {
  return (
    <div className="w-full text-black">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ className, ...props }: React.ComponentProps<'h1'>) => (
            <h1
              className={cn(
                'text-3xl sm:text-5xl font-black text-black mb-2 tracking-tighter leading-tight',
                className,
              )}
              {...props}
            />
          ),
          h2: ({ className, children, ...props }: React.ComponentProps<'h2'>) => {
            const text = typeof children === 'string' ? children : '';
            const isSources = /fuentes|sources|bibliograf/i.test(text);
            if (isSources) {
              return (
                <div className="mt-12 sm:mt-16 mb-6">
                  <div className="flex items-center gap-4 mb-2">
                    <span className="h-px flex-1 bg-slate-200" />
                    <h2
                      className={cn(
                        'flex items-center gap-2 text-slate-500 text-[12px] font-black uppercase tracking-[0.3em] px-4',
                        className,
                      )}
                    >
                      <Icon name="link" className="text-[16px]" />
                      {children}
                    </h2>
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                </div>
              );
            }
            return (
              <div className="mt-10 sm:mt-14 mb-6 sm:mb-8">
                <h2
                  className={cn(
                    'inline-block bg-[#FFC107] text-black text-[13px] font-black uppercase tracking-[0.2em] px-6 sm:px-8 py-3 rounded-full',
                    className,
                  )}
                  {...props}
                >
                  {children}
                </h2>
              </div>
            );
          },
          h3: ({ className, ...props }: React.ComponentProps<'h3'>) => (
            <h3
              className={cn(
                'text-lg sm:text-xl font-bold text-slate-800 mt-8 sm:mt-10 mb-4 uppercase tracking-wide',
                className,
              )}
              {...props}
            />
          ),
          p: ({ className, ...props }: React.ComponentProps<'p'>) => (
            <p
              className={cn(
                'text-base sm:text-[18px] leading-[1.8] text-slate-900 mb-6 sm:mb-8 font-normal',
                className,
              )}
              {...props}
            />
          ),
          hr: () => <div className="h-[5px] bg-[#FF1493] w-48 mb-12" />,
          ul: ({ className, ...props }: React.ComponentProps<'ul'>) => (
            <ul className={cn('space-y-3 mb-8 sm:mb-10 list-none', className)} {...props} />
          ),
          ol: ({ className, ...props }: React.ComponentProps<'ol'>) => (
            <ol className={cn('space-y-2 mb-8 sm:mb-10 list-none', className)} {...props} />
          ),
          li: ({ className, children, ...props }: React.ComponentProps<'li'>) => (
            <li
              className={cn(
                'flex items-start gap-3 sm:gap-4 text-base sm:text-[18px] text-slate-900 leading-relaxed font-normal relative',
                className,
              )}
              {...props}
            >
              <span className="text-[#FF1493] text-2xl leading-none mt-1 shrink-0">•</span>
              <span className="flex-1 min-w-0">{children}</span>
            </li>
          ),
          strong: ({ className, ...props }: React.ComponentProps<'strong'>) => (
            <strong className={cn('font-bold text-black', className)} {...props} />
          ),
          table: ({ className, ...props }: React.ComponentProps<'table'>) => (
            <div className="w-full my-8 sm:my-12 overflow-x-auto">
              <table
                className={cn('w-full border-collapse text-left min-w-full', className)}
                {...props}
              />
            </div>
          ),
          th: ({ className, ...props }: React.ComponentProps<'th'>) => (
            <th
              className={cn(
                'bg-slate-100 p-3 sm:p-5 text-left text-[12px] font-black uppercase tracking-widest border-b-2 border-slate-200',
                className,
              )}
              {...props}
            />
          ),
          td: ({ className, ...props }: React.ComponentProps<'td'>) => (
            <td
              className={cn(
                'p-3 sm:p-5 text-sm sm:text-[16px] border-b border-slate-50 text-slate-800 break-words',
                className,
              )}
              style={{ minWidth: '120px' }}
              {...props}
            />
          ),
          blockquote: ({ className, ...props }: React.ComponentProps<'blockquote'>) => (
            <blockquote
              className={cn(
                'border-l-[6px] sm:border-l-[8px] border-[#FF1493] pl-6 sm:pl-10 py-6 sm:py-8 italic bg-slate-50/50 rounded-r-3xl my-8 sm:my-12 text-xl sm:text-2xl text-slate-900 leading-relaxed',
                className,
              )}
              {...props}
            />
          ),
          a: ({ href, children, className, ...props }: React.ComponentProps<'a'>) => {
            const isInternal = href?.startsWith('#source-report-');
            return (
              <a
                href={href}
                target={isInternal ? '_self' : '_blank'}
                rel={isInternal ? undefined : 'noopener noreferrer'}
                className={cn(
                  'text-[hsl(var(--color-primary))] hover:underline cursor-pointer',
                  !isInternal && 'font-bold',
                  isInternal &&
                    'text-[12px] font-bold align-top bg-[hsl(var(--color-primary)/0.1)] px-1.5 rounded-md ml-0.5 inline-block -mt-1',
                  className,
                )}
                {...props}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {processCitations(content, 'report', structuredData?.news || [])}
      </ReactMarkdown>
    </div>
  );
}
