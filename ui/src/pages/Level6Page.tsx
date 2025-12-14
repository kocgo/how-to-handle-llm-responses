import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CODE_SAMPLE = `// ✅ Ultimate: Windowed rendering for massive content
function WindowedStreaming() {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredText = useDeferredValue(text);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 1000 });

  // Only render visible portion of text
  const windowedText = useMemo(() => {
    return deferredText.slice(visibleRange.start, visibleRange.end);
  }, [deferredText, visibleRange]);

  // Update visible range on scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    const charsPerPixel = 0.15; // Approximate
    const start = Math.floor(scrollTop * charsPerPixel);
    const visible = Math.ceil(clientHeight * charsPerPixel);

    setVisibleRange({ start, end: start + visible + 500 });
  }, []);

  // ... batching + transition logic ...

  return (
    <div ref={containerRef} onScroll={handleScroll}>
      {/* Spacer for scroll height */}
      <div style={{ height: deferredText.length / 0.15 }}>
        {/* Only render visible window */}
        <div style={{ transform: \`translateY(\${visibleRange.start / 0.15}px)\` }}>
          <MarkdownRenderer content={windowedText} />
        </div>
      </div>
    </div>
  );
}`

export function Level6Page() {
  return (
    <Layout currentLevel={6}>
      <header className="page-header">
        <h1>Level 6: Windowed Rendering</h1>
        <p className="subtitle">Only render what's visible</p>
      </header>

      <section className="explanation">
        <h2>The Problem</h2>
        <p>
          Even with all previous optimizations, rendering 100k+ characters of
          markdown is expensive. The DOM gets huge, and React has to diff
          thousands of elements on every update.
        </p>
        <p>
          The key insight: <strong>users can only see a small portion of the
          text at any time</strong>. Why render the entire document?
        </p>
      </section>

      <section className="explanation">
        <h2>The Solution</h2>
        <p>
          <strong>Windowed rendering</strong> (also called virtualization) only
          renders the text that's currently visible in the viewport, plus a
          small buffer above and below.
        </p>
        <p>Benefits:</p>
        <ul>
          <li><strong>Constant render cost</strong>: Whether you have 1k or 1M characters, render time stays the same</li>
          <li><strong>Smaller DOM</strong>: Fewer elements means faster updates</li>
          <li><strong>Lower memory</strong>: Less retained React fiber nodes</li>
        </ul>
        <p>Trade-offs:</p>
        <ul>
          <li>More complex implementation</li>
          <li>Scroll position calculation needed</li>
          <li>May affect text selection across window boundaries</li>
        </ul>
      </section>

      <section className="explanation">
        <h2>What You'll See</h2>
        <ul>
          <li><strong>Stable FPS</strong>: Even with 100k words, FPS stays high</li>
          <li><strong>Fast scrolling</strong>: Scroll through massive content smoothly</li>
          <li><strong>Window indicator</strong>: Shows which portion is being rendered</li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CODE_SAMPLE}
          language="tsx"
          title="WindowedStreaming.tsx"
          highlightLines={[14, 15, 16, 20, 21, 22, 23, 24, 25, 26, 35, 36, 37]}
        />
        <p className="code-note">
          Key insight: We track the scroll position and only slice the visible
          portion of text (lines 14-16). The container maintains full scroll
          height (line 35) while only rendering a small window (line 37).
        </p>
      </section>

      <section className="summary-section">
        <h2>The Complete Optimization Journey</h2>
        <div className="journey-cards">
          <div className="journey-card">
            <h3>Level 1</h3>
            <p>setState every chunk</p>
            <span className="journey-result bad">Too many renders</span>
          </div>
          <div className="journey-card">
            <h3>Level 2</h3>
            <p>Batch with rAF</p>
            <span className="journey-result better">Fewer renders</span>
          </div>
          <div className="journey-card">
            <h3>Level 3</h3>
            <p>startTransition</p>
            <span className="journey-result better">Interruptible</span>
          </div>
          <div className="journey-card">
            <h3>Level 4</h3>
            <p>useDeferredValue</p>
            <span className="journey-result better">Deferred render</span>
          </div>
          <div className="journey-card">
            <h3>Level 5</h3>
            <p>All combined</p>
            <span className="journey-result better">Production-ready</span>
          </div>
          <div className="journey-card highlight">
            <h3>Level 6</h3>
            <p>Windowed rendering</p>
            <span className="journey-result best">Scales infinitely</span>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <p className="demo-instruction">
          Try with 100k words - notice how FPS stays high even with massive
          content. Scroll through the output to see windowing in action.
        </p>
        <StreamingDemo
          level={6}
          batchStrategy="raf"
          useTransition={true}
          useDeferredValue={true}
          useWindowing={true}
        />
      </section>
    </Layout>
  )
}
