import { useState, useRef, useEffect, ReactNode, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'bottom';
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<Position>({ top: 0, left: 0, placement: 'top' });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceAbove = triggerRect.top;
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const tooltipHeight = tooltipRect.height || 150; // estimate if not yet rendered
    const tooltipWidth = 280;

    // Determine vertical placement
    const placement = spaceAbove > spaceBelow && spaceAbove > tooltipHeight ? 'top' : 'bottom';

    // Calculate top position
    let top: number;
    if (placement === 'top') {
      top = triggerRect.top - tooltipHeight - 8;
    } else {
      top = triggerRect.bottom + 8;
    }

    // Calculate left position (centered on trigger, but clamped to viewport)
    let left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
    
    // Clamp to viewport
    const padding = 8;
    left = Math.max(padding, Math.min(left, viewportWidth - tooltipWidth - padding));

    setPosition({ top, left, placement });
  }, []);

  useEffect(() => {
    if (isVisible) {
      updatePosition();
      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, updatePosition]);

  const tooltipElement = isVisible ? (
    <div
      ref={tooltipRef}
      className={`tooltip-portal tooltip-${position.placement}`}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 10000,
        width: 280,
      }}
    >
      <div className="tooltip-content">{content}</div>
      <div className="tooltip-arrow" />
    </div>
  ) : null;

  return (
    <span className="tooltip-wrapper" ref={triggerRef}>
      <span
        className="tooltip-trigger"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
      >
        {children}
      </span>
      {tooltipElement && createPortal(tooltipElement, document.body)}
    </span>
  );
}

export function InfoIcon() {
  return (
    <svg
      className="info-icon"
      viewBox="0 0 20 20"
      fill="currentColor"
      width="14"
      height="14"
    >
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface InfoTooltipProps {
  content: ReactNode;
}

export function InfoTooltip({ content }: InfoTooltipProps) {
  return (
    <Tooltip content={content}>
      <InfoIcon />
    </Tooltip>
  );
}
