import { useCallback, useEffect, useRef, useState } from 'react';
import type { FieldValues, Path, PathValue, UseFormReturn } from 'react-hook-form';

interface UseAiSuggestionsReturn<T extends FieldValues> {
  isSuggested: (field: Path<T>) => boolean;
  markSuggested: (field: Path<T>) => void;
  clearSuggested: (field: Path<T>) => void;
  applyIfEmptyOrSuggested: (field: Path<T>, value: PathValue<T, Path<T>>) => boolean;
}

function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function useAiSuggestions<T extends FieldValues>(
  form: UseFormReturn<T>,
  initialSuggested: ReadonlyArray<Path<T>> = [],
): UseAiSuggestionsReturn<T> {
  const [suggested, setSuggested] = useState<Set<string>>(
    () => new Set(initialSuggested as ReadonlyArray<string>),
  );
  const lastAppliedRef = useRef<Map<string, unknown>>(new Map());

  const markSuggested = useCallback((field: Path<T>) => {
    setSuggested((prev) => {
      if (prev.has(field as string)) return prev;
      const next = new Set(prev);
      next.add(field as string);
      return next;
    });
  }, []);

  const clearSuggested = useCallback((field: Path<T>) => {
    setSuggested((prev) => {
      if (!prev.has(field as string)) return prev;
      const next = new Set(prev);
      next.delete(field as string);
      return next;
    });
    lastAppliedRef.current.delete(field as string);
  }, []);

  const isSuggested = useCallback(
    (field: Path<T>) => suggested.has(field as string),
    [suggested],
  );

  const applyIfEmptyOrSuggested = useCallback(
    (field: Path<T>, value: PathValue<T, Path<T>>): boolean => {
      if (isEmptyValue(value)) return false;
      const current = form.getValues(field);
      const isCurrentEmpty = isEmptyValue(current);
      const wasSuggested = suggested.has(field as string);
      if (!isCurrentEmpty && !wasSuggested) return false;
      form.setValue(field, value, { shouldDirty: false, shouldValidate: false });
      lastAppliedRef.current.set(field as string, value);
      setSuggested((prev) => {
        if (prev.has(field as string)) return prev;
        const next = new Set(prev);
        next.add(field as string);
        return next;
      });
      return true;
    },
    [form, suggested],
  );

  useEffect(() => {
    const subscription = form.watch((values, { name, type }) => {
      if (!name || type !== 'change') return;
      if (!suggested.has(name)) return;
      const current = values[name as keyof typeof values];
      const applied = lastAppliedRef.current.get(name);
      if (current !== applied) {
        setSuggested((prev) => {
          if (!prev.has(name)) return prev;
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        lastAppliedRef.current.delete(name);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, suggested]);

  return { isSuggested, markSuggested, clearSuggested, applyIfEmptyOrSuggested };
}
