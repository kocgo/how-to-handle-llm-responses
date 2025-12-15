import { useState, useRef, useCallback, useTransition, useDeferredValue } from 'react';
import { BenchmarkOptions } from '../types';

export interface StreamChunk {
  content: string;
}

interface UseStreamingReturn {
  text: string;
  displayText: string;
  isPending: boolean;
  isStale: boolean;
  isStreaming: boolean;
  charCount: number;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

/**
 * Hook to manage SSE streaming from the server
 * Supports RAF batching, transitions, and deferred values
 */
export function useStreaming(options: BenchmarkOptions): UseStreamingReturn {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const deferredText = useDeferredValue(text);

  const abortControllerRef = useRef<AbortController | null>(null);
  const bufferRef = useRef('');
  const rafIdRef = useRef<number>();

  const isStale = options.useDeferredValue ? text !== deferredText : false;
  const displayText = options.useDeferredValue ? deferredText : text;

  const updateText = useCallback(
    (newText: string) => {
      if (options.useTransition) {
        startTransition(() => setText(newText));
      } else {
        setText(newText);
      }
    },
    [options.useTransition],
  );

  const reset = useCallback(() => {
    setText('');
    bufferRef.current = '';
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = undefined;
    }
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = undefined;
    }
    setIsStreaming(false);
  }, []);

  const start = useCallback(async () => {
    reset();
    setIsStreaming(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`/stream?words=${options.words}&delay=${options.delay}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (options.useRafBatching && bufferRef.current) {
                updateText(bufferRef.current);
              }
              setIsStreaming(false);
              return;
            }

            try {
              const chunk: StreamChunk = JSON.parse(data);

              if (!options.useRafBatching) {
                setText((prev) => prev + chunk.content);
              } else {
                bufferRef.current += chunk.content;
                if (!rafIdRef.current) {
                  rafIdRef.current = requestAnimationFrame(() => {
                    updateText(bufferRef.current);
                    rafIdRef.current = undefined;
                  });
                }
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      if (options.useRafBatching && bufferRef.current) {
        updateText(bufferRef.current);
      }
      setIsStreaming(false);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Stream error:', error);
      }
      setIsStreaming(false);
    }
  }, [options.useRafBatching, options.words, options.delay, reset, updateText]);

  return {
    text,
    displayText,
    isPending: options.useTransition ? isPending : false,
    isStale,
    isStreaming,
    charCount: text.length,
    start,
    stop,
    reset,
  };
}
