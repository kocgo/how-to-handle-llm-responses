import { useState, useCallback } from 'react';
import { BenchmarkOptions, DEFAULT_OPTIONS } from '../types';

/**
 * Hook to manage benchmark options state with helper methods
 */
export function useBenchmarkOptions(initialOptions = DEFAULT_OPTIONS) {
  const [options, setOptions] = useState<BenchmarkOptions>(initialOptions);

  const toggle = useCallback((key: keyof BenchmarkOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const set = useCallback(<K extends keyof BenchmarkOptions>(
    key: K,
    value: BenchmarkOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setNumber = useCallback((key: 'words' | 'delay', value: number) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setOptions(initialOptions);
  }, [initialOptions]);

  return {
    options,
    setOptions,
    toggle,
    set,
    setNumber,
    reset,
  };
}
