import { useEffect, RefObject } from 'react';

interface UseAutoScrollOptions {
  enabled: boolean;
  useVirtualization: boolean;
}

/**
 * Hook to handle auto-scrolling to bottom of container
 * Only active when virtualization is disabled (virtualization handles its own scroll)
 */
export function useAutoScroll(
  containerRef: RefObject<HTMLElement>,
  content: string,
  options: UseAutoScrollOptions
) {
  const { enabled, useVirtualization } = options;

  useEffect(() => {
    if (!enabled || useVirtualization || !containerRef.current) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [content, enabled, useVirtualization]);
}
