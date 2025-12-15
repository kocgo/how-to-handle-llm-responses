import { memo, CSSProperties, useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AnimatedMarkdown } from '@nvq/flowtoken';
import '@nvq/flowtoken/dist/styles.css';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RenderMode, AnimationType } from './types';
import { StreamingFadeInText } from './components';

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
  cssOptimizations?: CssOptimizations;
  useLightweightMarkdown?: boolean;
  useMillionJs?: boolean;
}

// Cache for parsed segments to avoid re-parsing
const segmentCache = new WeakMap<object, { content: string; segments: ParsedSegment[] }>();
const blockCache = new WeakMap<object, { content: string; blocks: string[] }>();

interface ParsedSegment {
  type: 'text' | 'markdown';
  content: string;
}

// Fast segment parser with caching
function parseMixedSegments(content: string, cacheKey: object): ParsedSegment[] {
  const cached = segmentCache.get(cacheKey);
  if (cached && cached.content === content) {
    return cached.segments;
  }
  
  const segments: ParsedSegment[] = [];
  const regex = /<markdown>([\s\S]*?)<\/markdown>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'markdown', content: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  
  segmentCache.set(cacheKey, { content, segments });
  return segments;
}

// Split content into blocks for virtualization
function splitIntoBlocks(content: string, mode: RenderMode): string[] {
  if (!content) return [];
  
  if (mode === 'text') {
    // For text mode, split by lines
    return content.split('\n');
  }
  
  if (mode === 'markdown') {
    // For markdown, split by double newlines (paragraphs) or code blocks
    // This preserves code blocks as single units
    const blocks: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let match;
    
    // First extract code blocks
    const segments: { type: 'code' | 'text'; content: string; start: number }[] = [];
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: content.slice(lastIndex, match.index), start: lastIndex });
      }
      segments.push({ type: 'code', content: match[0], start: match.index });
      lastIndex = codeBlockRegex.lastIndex;
    }
    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex), start: lastIndex });
    }
    
    // Now split text segments by paragraphs, keep code blocks whole
    for (const segment of segments) {
      if (segment.type === 'code') {
        blocks.push(segment.content);
      } else {
        // Split by double newlines for paragraphs
        const paragraphs = segment.content.split(/\n\n+/).filter(p => p.trim());
        blocks.push(...paragraphs);
      }
    }
    
    return blocks.length > 0 ? blocks : [content];
  }
  
  if (mode === 'mixed') {
    // For mixed mode, split by <markdown> tags and then by paragraphs within each
    const blocks: string[] = [];
    const regex = /<markdown>([\s\S]*?)<\/markdown>/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      // Text before markdown tag - split by lines
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index);
        const lines = textContent.split('\n').filter(l => l.trim());
        blocks.push(...lines.map(l => `__TEXT__${l}`));
      }
      // Markdown content - keep as single block with marker
      blocks.push(`__MARKDOWN__${match[1]}`);
      lastIndex = regex.lastIndex;
    }
    // Remaining text
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      const lines = textContent.split('\n').filter(l => l.trim());
      blocks.push(...lines.map(l => `__TEXT__${l}`));
    }
    
    return blocks.length > 0 ? blocks : [`__TEXT__${content}`];
  }
  
  return [content];
}

// Markdown components for non-animated rendering
const markdownComponents = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    return !inline && match ? (
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

function OutputRendererInner({
  content,
  renderMode,
  animate = false,
  animationType = 'fadeIn',
  animationDuration = '0.5s',
  useVirtualization = false,
  autoScroll = false,
  cssOptimizations,
  useLightweightMarkdown = false,
  useMillionJs = false,
}: OutputRendererProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [animatedBlockCount, setAnimatedBlockCount] = useState(0);
  
  // Stable cache key for this component instance
  const cacheKeyRef = useRef({});

  // Memoize blocks splitting - only recompute when content or mode changes
  const blocks = useMemo(() => 
    splitIntoBlocks(content, renderMode), 
    [content, renderMode]
  );
  
  // Memoize segment parsing for mixed mode (non-virtualized)
  const mixedSegments = useMemo(() => {
    if (renderMode !== 'mixed' || useVirtualization) return [];
    return parseMixedSegments(content, cacheKeyRef.current);
  }, [content, renderMode, useVirtualization]);
  
  // Lightweight markdown components (no syntax highlighting)
  const lightweightComponents = useMemo(() => ({
    code({ node, inline, className, children, ...props }: any) {
      return (
        <code className={`${className || ''} lightweight-code`} {...props}>
          {children}
        </code>
      );
    },
  }), []);

  // Virtualizer with dynamic measurement
  const virtualizer = useVirtualizer({
    count: blocks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => {
      // Estimate based on render mode
      if (renderMode === 'text') return 20;
      if (renderMode === 'markdown') return 60; // Paragraphs are typically taller
      return 40; // Mixed
    }, [renderMode]),
    overscan: 5,
  });

  // Track new blocks for animation
  useEffect(() => {
    if (animate && useVirtualization && blocks.length > animatedBlockCount) {
      setAnimatedBlockCount(blocks.length);
    }
  }, [blocks.length, animate, useVirtualization, animatedBlockCount]);

  // Reset when content is cleared
  useEffect(() => {
    if (!content) {
      setAnimatedBlockCount(0);
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

  // ============================================
  // VIRTUALIZED RENDERING
  // ============================================
  if (useVirtualization) {
    return (
      <div
        ref={parentRef}
        className="virtualized-container"
        style={{
          ...cssOptStyles,
          height: '100%',
          overflow: 'auto',
          padding: '1rem',
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
            const block = blocks[virtualItem.index];
            const isNewBlock = animate && virtualItem.index >= animatedBlockCount - 5;
            
            // Animation styles
            const animationStyles: CSSProperties = isNewBlock ? {
              animationName: animationType,
              animationDuration,
              animationTimingFunction: 'ease-out',
              animationFillMode: 'both',
            } : {};

            // Select markdown components based on lightweight mode
            const mdComponents = useLightweightMarkdown ? lightweightComponents : markdownComponents;

            // Render based on mode
            let blockContent: React.ReactNode;

            if (renderMode === 'text') {
              // Plain text line
              blockContent = (
                <div
                  className={isNewBlock ? animationType : undefined}
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.875rem',
                    color: '#e2e8f0',
                    lineHeight: '20px',
                    whiteSpace: 'pre',
                    ...animationStyles,
                  }}
                >
                  {block || '\u00A0'}
                </div>
              );
            } else if (renderMode === 'markdown') {
              // Markdown block
              blockContent = (
                <div
                  className={`output-markdown-block ${isNewBlock ? animationType : ''}`}
                  style={animationStyles}
                >
                  <ReactMarkdown components={mdComponents}>
                    {block}
                  </ReactMarkdown>
                </div>
              );
            } else if (renderMode === 'mixed') {
              // Mixed mode - check prefix
              if (block.startsWith('__MARKDOWN__')) {
                const mdContent = block.slice(12);
                blockContent = (
                  <div
                    className={`output-markdown-segment ${isNewBlock ? animationType : ''}`}
                    style={animationStyles}
                  >
                    <ReactMarkdown components={mdComponents}>
                      {mdContent}
                    </ReactMarkdown>
                  </div>
                );
              } else {
                const textContent = block.startsWith('__TEXT__') ? block.slice(8) : block;
                blockContent = (
                  <div
                    className={isNewBlock ? animationType : undefined}
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: '0.875rem',
                      color: '#e2e8f0',
                      whiteSpace: 'pre-wrap',
                      ...animationStyles,
                    }}
                  >
                    {textContent || '\u00A0'}
                  </div>
                );
              }
            }

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                {blockContent}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ============================================
  // NON-VIRTUALIZED RENDERING
  // ============================================

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
    
    // Million.js optimization - render as single pre block
    if (useMillionJs) {
      return (
        <pre 
          className="output-text output-million" 
          style={{
            ...cssOptStyles,
            margin: 0,
          }}
        >
          {content}
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
  // Uses memoized segments for performance
  if (renderMode === 'mixed') {
    // Million.js mode - simplified rendering without segment parsing
    if (useMillionJs && !animate) {
      return (
        <pre 
          className="output-mixed output-million" 
          style={{
            ...cssOptStyles,
            fontFamily: "'Fira Code', monospace",
            fontSize: '0.875rem',
            color: '#e2e8f0',
            whiteSpace: 'pre-wrap',
            margin: 0,
          }}
        >
          {content.replace(/<\/?markdown>/g, '')}
        </pre>
      );
    }
    
    return (
      <div className="output-mixed" style={cssOptStyles}>
        {mixedSegments.map((segment, index) => (
          <MemoizedSegment
            key={index}
            segment={segment}
            animate={animate}
            animationType={animationType}
            animationDuration={animationDuration}
            useLightweightMarkdown={useLightweightMarkdown}
          />
        ))}
      </div>
    );
  }

  // Markdown mode - full markdown parsing for entire content
  return (
    <div className="output-markdown" style={cssOptStyles}>
      {useLightweightMarkdown ? (
        <ReactMarkdown>{content}</ReactMarkdown>
      ) : (
        <AnimatedMarkdown
          content={content}
          animation={animate ? animationType : null}
          animationDuration={animationDuration}
          animationTimingFunction="ease-out"
          codeStyle={vscDarkPlus}
        />
      )}
    </div>
  );
}

// Lightweight markdown components (no syntax highlighting)
const lightweightMdComponents = {
  code({ node, inline, className, children, ...props }: any) {
    return (
      <code className={`${className || ''} lightweight-code`} {...props}>
        {children}
      </code>
    );
  },
};

// Memoized segment renderer - prevents re-rendering unchanged segments
const MemoizedSegment = memo(function MemoizedSegment({
  segment,
  animate,
  animationType,
  animationDuration,
  useLightweightMarkdown = false,
}: {
  segment: ParsedSegment;
  animate: boolean;
  animationType: AnimationType;
  animationDuration: string;
  useLightweightMarkdown?: boolean;
}) {
  if (segment.type === 'text') {
    if (animate) {
      return (
        <pre className="output-text-segment">
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
      <pre className="output-text-segment">
        {segment.content}
      </pre>
    );
  }
  
  // Use lightweight ReactMarkdown or full AnimatedMarkdown
  if (useLightweightMarkdown) {
    return (
      <div className="output-markdown-segment">
        <ReactMarkdown components={lightweightMdComponents}>
          {segment.content}
        </ReactMarkdown>
      </div>
    );
  }
  
  return (
    <div className="output-markdown-segment">
      <AnimatedMarkdown
        content={segment.content}
        animation={animate ? animationType : null}
        animationDuration={animationDuration}
        animationTimingFunction="ease-out"
        codeStyle={vscDarkPlus}
      />
    </div>
  );
});

export const OutputRenderer = memo(OutputRendererInner);
