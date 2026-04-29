import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type SiraContextKind = 'news' | 'competitor' | 'content' | 'report' | 'free';

export interface SiraContext {
  kind: SiraContextKind;
  id?: string;
  title?: string;
  data?: Record<string, unknown>;
}

interface SiraContextualValue {
  open: boolean;
  collapsed: boolean;
  context: SiraContext | null;
  openWith: (ctx: SiraContext) => void;
  close: () => void;
  toggleCollapsed: () => void;
  setCollapsed: (v: boolean) => void;
}

const Ctx = createContext<SiraContextualValue | null>(null);

export function SiraContextualProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [context, setContext] = useState<SiraContext | null>(null);

  const openWith = useCallback((ctx: SiraContext) => {
    setContext(ctx);
    setOpen(true);
    setCollapsed(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  const value = useMemo<SiraContextualValue>(
    () => ({ open, collapsed, context, openWith, close, toggleCollapsed, setCollapsed }),
    [open, collapsed, context, openWith, close, toggleCollapsed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSiraContextual(): SiraContextualValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSiraContextual must be used within SiraContextualProvider');
  return v;
}
