import { memo, CSSProperties } from 'react';
import { AnimatedMarkdown } from '@nvq/flowtoken';
import '@nvq/flowtoken/dist/styles.css';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RenderMode, AnimationType } from './types';

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
  cssOptimizations?: CssOptimizations;
}

function OutputRendererInner({
  content,
  renderMode,
  animate = false,
  animationType = 'fadeIn',
  animationDuration = '0.5s',
  cssOptimizations,
}: OutputRendererProps) {
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

  // Animated mode using FlowToken (works with markdown too!)
  if (animate) {
    return (
      <div
        className={renderMode === 'text' ? 'output-text' : 'output-markdown'}
        style={cssOptStyles}
      >
        <AnimatedMarkdown
          content={content}
          animation={animationType}
          animationDuration={animationDuration}
          animationTimingFunction="ease-out"
          codeStyle={vscDarkPlus}
        />
      </div>
    );
  }

  // Plain text mode (no animation)
  if (renderMode === 'text') {
    return (
      <pre className="output-text" style={cssOptStyles}>
        {content}
      </pre>
    );
  }

  // Non-animated markdown - use FlowToken with animation disabled
  return (
    <div className="output-markdown" style={cssOptStyles}>
      <AnimatedMarkdown
        content={content}
        animation={null}
        codeStyle={vscDarkPlus}
      />
    </div>
  );
}

export const OutputRenderer = memo(OutputRendererInner);
