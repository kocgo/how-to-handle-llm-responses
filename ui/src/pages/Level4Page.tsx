import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CODE_SAMPLE = `// ✅ Defer expensive rendering
function DeferredStreaming() {
  const [text, setText] = useState('');
  const deferredText = useDeferredValue(text);
  const isStale = text !== deferredText;

  // ... batching logic same as Level 2 ...

  return (
    <div>
      {/* Cheap: always current */}
      <span>{text.length} chars</span>

      {/* Expensive: allowed to lag behind */}
      <div style={{ opacity: isStale ? 0.7 : 1 }}>
        <MarkdownRenderer content={deferredText} />
      </div>
    </div>
  );
}`

export function Level4Page() {
  return (
    <Layout currentLevel={4}>
      <header className="page-header">
        <h1>Level 4: useDeferredValue for Expensive Renders</h1>
        <p className="subtitle">useDeferredValue for render</p>
      </header>

      <section className="explanation">
        <h2>The Problem</h2>
        <p>
          With <code>startTransition</code>, we made state updates
          interruptible. But there's another approach: what if the{' '}
          <strong>state updates quickly</strong>, but we let the{' '}
          <strong>expensive render lag behind</strong>?
        </p>
        <p>
          Consider: updating a character count is instant, but rendering
          markdown with syntax highlighting is expensive. Why should the cheap
          operation wait for the expensive one?
        </p>
      </section>

      <section className="explanation">
        <h2>The Solution</h2>
        <p>
          <code>useDeferredValue</code> creates a{' '}
          <strong>copy of a value that can lag behind</strong> during urgent
          updates. Here's how it works:
        </p>
        <ol>
          <li>
            <code>text</code> updates immediately with each batch
          </li>
          <li>
            <code>deferredText</code> follows, but React can delay it if there's
            urgent work
          </li>
          <li>
            Cheap components use <code>text</code> (always current)
          </li>
          <li>
            Expensive components use <code>deferredText</code> (may lag)
          </li>
        </ol>
        <p>
          The <code>isStale</code> pattern (<code>text !== deferredText</code>)
          lets you show visual feedback when the expensive render is catching
          up.
        </p>
      </section>

      <section className="explanation">
        <h2>What You'll See</h2>
        <ul>
          <li><strong>Instant char count</strong>: The character count updates immediately</li>
          <li><strong>isStale indicator</strong>: Watch "isStale: true/false" during streaming</li>
          <li><strong>Visual feedback</strong>: The output dims when catching up</li>
          <li><strong>Smooth input</strong>: Typing remains responsive</li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CODE_SAMPLE}
          language="tsx"
          title="DeferredStreaming.tsx"
          highlightLines={[4, 5, 13, 16, 17]}
        />
        <p className="code-note">
          Key insight: <code>useDeferredValue</code> (line 4) creates a lagging
          copy. We detect staleness (line 5) and use different values for cheap
          vs. expensive renders (lines 13 vs 17).
        </p>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <p className="demo-instruction">
          Watch the "isStale" indicator. Notice how the char count stays current
          while the markdown rendering catches up. The output dims when stale.
        </p>
        <StreamingDemo
          level={4}
          batchStrategy="raf"
          useTransition={false}
          useDeferredValue={true}
        />
      </section>
    </Layout>
  )
}
