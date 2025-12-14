import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CODE_SAMPLE = `// ✅ Production-ready: All optimizations combined
function OptimizedStreaming() {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredText = useDeferredValue(text);
  const isStale = text !== deferredText;

  const bufferRef = useRef('');
  const rafIdRef = useRef<number>();

  function onChunk(token: string) {
    bufferRef.current += token;

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        const snapshot = bufferRef.current;
        startTransition(() => {
          setText(snapshot);
        });
        rafIdRef.current = undefined;
      });
    }
  }

  return (
    <div style={{ opacity: isPending ? 0.9 : 1 }}>
      <span>{text.length} chars</span>
      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <MemoizedMarkdownRenderer content={deferredText} />
      </div>
    </div>
  );
}

// Don't forget to memoize expensive children!
const MemoizedMarkdownRenderer = memo(MarkdownRenderer);`

export function Level5Page() {
  return (
    <Layout currentLevel={5}>
      <header className="page-header">
        <h1>Level 5: Production-Ready Combined Approach</h1>
        <p className="subtitle">All optimizations combined</p>
      </header>

      <section className="explanation">
        <h2>The Complete Solution</h2>
        <p>
          For production LLM streaming UIs, combine all the optimizations we've
          learned:
        </p>
        <ol>
          <li>
            <strong>Batching with rAF</strong>: Accumulate tokens in a ref,
            flush once per frame
          </li>
          <li>
            <strong>startTransition</strong>: Make updates interruptible so user
            input wins
          </li>
          <li>
            <strong>useDeferredValue</strong>: Let cheap UI stay current while
            expensive renders lag
          </li>
          <li>
            <strong>React.memo</strong>: Prevent unnecessary re-renders of
            expensive children
          </li>
        </ol>
      </section>

      <section className="explanation">
        <h2>How They Work Together</h2>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Optimization</th>
              <th>What It Does</th>
              <th>When It Helps</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>rAF Batching</td>
              <td>Reduces setState calls</td>
              <td>High token frequency</td>
            </tr>
            <tr>
              <td>startTransition</td>
              <td>Makes updates interruptible</td>
              <td>User typing/clicking</td>
            </tr>
            <tr>
              <td>useDeferredValue</td>
              <td>Separates cheap/expensive renders</td>
              <td>Complex markdown/code</td>
            </tr>
            <tr>
              <td>React.memo</td>
              <td>Skips unchanged subtrees</td>
              <td>Stable child components</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="explanation">
        <h2>What You'll See</h2>
        <ul>
          <li><strong>Smooth 60 FPS</strong>: Frame rate stays stable even under load</li>
          <li><strong>Instant input response</strong>: Typing is never blocked</li>
          <li><strong>Both indicators</strong>: Watch isPending AND isStale</li>
          <li><strong>Professional UX</strong>: Visual feedback for all states</li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CODE_SAMPLE}
          language="tsx"
          title="OptimizedStreaming.tsx"
          highlightLines={[4, 5, 17, 18, 19, 28, 29, 35]}
        />
        <p className="code-note">
          The complete pattern: batching (lines 17-19) + startTransition (line
          17-19) + useDeferredValue (line 5, 28) + memoization (line 35).
        </p>
      </section>

      <section className="summary-section">
        <h2>Summary: The Journey</h2>
        <div className="journey-cards">
          <div className="journey-card">
            <h3>Level 1</h3>
            <p>Naive setState on every chunk</p>
            <span className="journey-result bad">Poor performance</span>
          </div>
          <div className="journey-card">
            <h3>Level 2</h3>
            <p>Batch with requestAnimationFrame</p>
            <span className="journey-result better">Fewer renders</span>
          </div>
          <div className="journey-card">
            <h3>Level 3</h3>
            <p>startTransition for priority</p>
            <span className="journey-result better">Interruptible</span>
          </div>
          <div className="journey-card">
            <h3>Level 4</h3>
            <p>useDeferredValue for expensive renders</p>
            <span className="journey-result better">Deferred rendering</span>
          </div>
          <div className="journey-card highlight">
            <h3>Level 5</h3>
            <p>All optimizations combined</p>
            <span className="journey-result best">Production-ready</span>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <p className="demo-instruction">
          This is the production-ready version. Try typing while streaming at
          high speed. Notice both isPending and isStale indicators. Compare the
          FPS and render count to Level 1!
        </p>
        <StreamingDemo
          level={5}
          batchStrategy="raf"
          useTransition={true}
          useDeferredValue={true}
        />
      </section>
    </Layout>
  )
}
