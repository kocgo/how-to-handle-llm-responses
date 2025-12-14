import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CODE_SAMPLE = `// ✅ Better: Buffer in ref, flush on animation frame
function BatchedStreaming() {
  const [text, setText] = useState('');
  const bufferRef = useRef('');
  const rafIdRef = useRef<number>();

  function onChunk(token: string) {
    bufferRef.current += token;  // 🟡 Accumulate without re-render

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        setText(bufferRef.current);  // 🟢 Single update per frame
        rafIdRef.current = undefined;
      });
    }
  }

  return <MarkdownRenderer content={text} />;
}`

export function Level2Page() {
  return (
    <Layout currentLevel={2}>
      <header className="page-header">
        <h1>Level 2: Batching with requestAnimationFrame</h1>
        <p className="subtitle">useRef + requestAnimationFrame</p>
      </header>

      <section className="explanation">
        <h2>The Problem</h2>
        <p>
          Level 1 caused too many re-renders because we called{' '}
          <code>setState</code> on every chunk. Even at 20ms intervals, that's
          50 re-renders per second - far more than the browser's 60 FPS refresh
          rate.
        </p>
      </section>

      <section className="explanation">
        <h2>The Solution</h2>
        <p>
          Instead of triggering a re-render for each token, we can{' '}
          <strong>batch multiple tokens together</strong> and update the UI once
          per animation frame.
        </p>
        <p>The technique:</p>
        <ol>
          <li>
            Store incoming tokens in a <code>useRef</code> (doesn't trigger
            re-renders)
          </li>
          <li>
            Schedule a single <code>requestAnimationFrame</code> to flush the
            buffer
          </li>
          <li>
            Only call <code>setState</code> once per frame, with all accumulated
            tokens
          </li>
        </ol>
        <p>
          This reduces re-renders from potentially hundreds per second down to a
          maximum of 60 (one per frame).
        </p>
      </section>

      <section className="explanation">
        <h2>What You'll See</h2>
        <ul>
          <li><strong>Higher FPS</strong>: Frame rate stays much more stable</li>
          <li><strong>Lower render count</strong>: Far fewer re-renders than Level 1</li>
          <li><strong>Better input response</strong>: Typing is smoother, but still not perfect</li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CODE_SAMPLE}
          language="tsx"
          title="BatchedStreaming.tsx"
          highlightLines={[8, 10, 11, 12]}
        />
        <p className="code-note">
          Key insight: We accumulate in a ref (line 8) and only update state
          once per animation frame (lines 10-12). This batches multiple tokens
          into a single re-render.
        </p>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <p className="demo-instruction">
          Compare this to Level 1 - notice the higher FPS and lower render count.
          Typing should feel smoother, but there's still room for improvement.
        </p>
        <StreamingDemo
          level={2}
          batchStrategy="raf"
          useTransition={false}
          useDeferredValue={false}
        />
      </section>
    </Layout>
  )
}
