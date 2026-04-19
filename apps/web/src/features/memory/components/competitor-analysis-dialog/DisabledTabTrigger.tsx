import type { ReactNode } from 'react';
import {
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@radikal/ui';

interface Props {
  value: string;
  disabled: boolean;
  tooltip: string;
  children: ReactNode;
}

export function DisabledTabTrigger({ value, disabled, tooltip, children }: Props) {
  if (!disabled) {
    return (
      <TabsTrigger value={value} className="shrink-0">
        {children}
      </TabsTrigger>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0">
          <TabsTrigger value={value} disabled className="shrink-0 cursor-not-allowed">
            {children}
          </TabsTrigger>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[260px]">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
