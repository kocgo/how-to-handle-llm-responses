import { memo, CSSProperties, useRef, useEffect, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatedMarkdown } from '@nvq/flowtoken';
import '@nvq/flowtoken/dist/styles.css';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RenderMode, AnimationType, ScrollBehavior } from './types';
import { StreamingFadeInText } from './StreamingFadeInText';

interface CssOptimizations {
  useContentVisibility: boolean;
  useContain: boolean;
  useWillChange: boolean;
}

interface OutputRendererProps {
  content: string;
  renderMode: RenderMode;
  animate?: boolean;
  animationType?: AnimationType;
  animationDuration?: string;
  useVirtualization?: boolean;
  autoScroll?: boolean;
  scrollBehavior?: ScrollBehavior;
  cssOptimizations?: CssOptimizations;
}

function OutputRendererInner({
  content,
  renderMode,
  animate = false,
  animationType = 'fadeIn',
  animationDuration = '0.5s',
  useVirtualization = false,
  autoScroll = false,
  scrollBehavior = 'smooth',
  cssOptimizations,
}: OutputRendererProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [animatedLineCount, setAnimatedLineCount] = useState(0);

  // Split content into lines for virtualization
  const lines = content ? content.split('\n') : [];

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20, // Estimated line height
    overscan: 10,
  });

  // Track new lines for animation
  useEffect(() => {
    if (animate && useVirtualization && lines.length > animatedLineCount) {
      setAnimatedLineCount(lines.length);
    }
  }, [lines.length, animate, useVirtualization, animatedLineCount]);

  // Reset animated line count when content is cleared
  useEffect(() => {
    if (!content) {
      setAnimatedLineCount(0);
    }
  }, [content]);

  // Auto-scroll for virtualized content
  useEffect(() => {
    if (useVirtualization && autoScroll && parentRef.current) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [content, useVirtualization, autoScroll]);

  if (!content) {
    return <p className="placeholder">Click "Run" to start streaming...</p>;
  }

  // Build CSS optimization styles
  const cssOptStyles: CSSProperties = cssOptimizations
    ? {
        contentVisibility: cssOptimizations.useContentVisibility ? 'auto' : undefined,
        contain: cssOptimizations.useContain ? 'content' : undefined,
        willChange: cssOptimizations.useWillChange ? 'transform, opacity' : undefined,
      }
    : {};

  // Virtualized text mode - use simple non-wrapping lines for consistent height
  if (useVirtualization && renderMode === 'text') {
    return (
      <div
        ref={parentRef}
        className="virtualized-container"
        style={{ 
          ...cssOptStyles, 
          height: '100%', 
          overflow: 'auto',
          fontFamily: "'Fira Code', monospace",
          fontSize: '0.875rem',
          color: '#e2e8f0',
          padding: '1rem',
          scrollBehavior: scrollBehavior === 'smooth' ? 'smooth' : 'auto',
        }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            // Check if this is a "new" line that should animate
            const isNewLine = animate && virtualItem.index >= animatedLineCount - 10;
            
            return (
              <div
                key={virtualItem.key}
                className={isNewLine ? animationType : undefined}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '20px',
                  lineHeight: '20px',
                  transform: `translateY(${virtualItem.start}px)`,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  ...(isNewLine ? {
                    animationDuration,
                    animationTimingFunction: 'ease-out',
                    animationFillMode: 'both',
                  } : {}),
                }}
              >
                {lines[virtualItem.index] || '\u00A0'}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Plain text mode - no parsing at all
  if (renderMode === 'text') {
    if (animate) {
      return (
        <pre className="output-text" style={cssOptStyles}>
          <StreamingFadeInText
            incomingText={content}
            animation={animationType}
            animationDuration={animationDuration}
            sep="word"
          />
        </pre>
      );
    }
    return (
      <pre className="output-text" style={cssOptStyles}>
        {content}
      </pre>
    );
  }

  // Mixed mode - text with <markdown>...</markdown> segments
  if (renderMode === 'mixed') {
    // Parse content into segments of text and markdown
    const segments: { type: 'text' | 'markdown'; content: string }[] = [];
    const regex = /<markdown>([\s\S]*?)<\/markdown>/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before this markdown tag
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      // Add markdown content
      segments.push({ type: 'markdown', content: match[1] });
      lastIndex = regex.lastIndex;
    }
    // Add remaining text after last markdown tag
    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex) });
    }

    return (
      <div className="output-mixed" style={cssOptStyles}>
        {segments.map((segment, index) => {
          if (segment.type === 'text') {
            if (animate) {
              return (
                <pre key={index} className="output-text-segment">
                  <StreamingFadeInText
                    incomingText={segment.content}
                    animation={animationType}
                    animationDuration={animationDuration}
                    sep="word"
                  />
                </pre>
              );
            }
            return (
              <pre key={index} className="output-text-segment">
                {segment.content}
              </pre>
            );
          } else {
            return (
              <div key={index} className="output-markdown-segment">
                <AnimatedMarkdown
                  content={segment.content}
                  animation={animate ? animationType : null}
                  animationDuration={animationDuration}
                  animationTimingFunction="ease-out"
                  codeStyle={vscDarkPlus}
                />
              </div>
            );
          }
        })}
      </div>
    );
  }

  // Markdown mode - full markdown parsing for entire content
  return (
    <div className="output-markdown" style={cssOptStyles}>
      <AnimatedMarkdown
        content={content}
        animation={animate ? animationType : null}
        animationDuration={animationDuration}
        animationTimingFunction="ease-out"
        codeStyle={vscDarkPlus}
      />
    </div>
  );
}

export const OutputRenderer = memo(OutputRendererInner);
