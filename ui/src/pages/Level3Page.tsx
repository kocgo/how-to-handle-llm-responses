import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CODE_SAMPLE = `// ✅ Even better: Mark updates as non-urgent
function TransitionStreaming() {
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();
  const bufferRef = useRef('');
  const rafIdRef = useRef<number>();

  function onChunk(token: string) {
    bufferRef.current += token;

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        const snapshot = bufferRef.current;
        startTransition(() => {
          setText(snapshot);  // 🟢 React can interrupt this for urgent work
        });
        rafIdRef.current = undefined;
      });
    }
  }

  return (
    <div style={{ opacity: isPending ? 0.8 : 1 }}>
      <MarkdownRenderer content={text} />
    </div>
  );
}`

export function Level3Page() {
  return (
    <Layout currentLevel={3}>
      <header className="page-header">
        <h1>Level 3: startTransition for Priority</h1>
        <p className="subtitle">startTransition for setState</p>
      </header>

      <section className="explanation">
        <h2>The Problem</h2>
        <p>
          Level 2's batching reduced the number of re-renders, but it doesn't
          change the <strong>priority</strong> of those updates. When React
          processes a state update, it blocks until the render is complete.
        </p>
        <p>
          This means user interactions (typing, clicking) still have to wait for
          the streaming update to finish rendering. The markdown parsing and
          syntax highlighting can take 10-50ms, during which the UI is frozen.
        </p>
      </section>

      <section className="explanation">
        <h2>The Solution</h2>
        <p>
          React 18 introduced <code>startTransition</code>, which marks a state
          update as <strong>non-urgent</strong>. This tells React:
        </p>
        <blockquote>
          "This update can wait if something more important comes in."
        </blockquote>
        <p>
          When you type while a transition is rendering, React will:
        </p>
        <ol>
          <li>Pause the transition render</li>
          <li>Process your keystroke (urgent update)</li>
          <li>Resume the transition render</li>
        </ol>
        <p>
          The <code>isPending</code> state lets you show visual feedback that a
          transition is in progress.
        </p>
      </section>

      <section className="explanation">
        <h2>What You'll See</h2>
        <ul>
          <li><strong>Better input response</strong>: Typing feels more responsive during streaming</li>
          <li><strong>isPending indicator</strong>: Watch the "isPending: true/false" status</li>
          <li><strong>Visual feedback</strong>: The output area dims slightly while pending</li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CODE_SAMPLE}
          language="tsx"
          title="TransitionStreaming.tsx"
          highlightLines={[4, 14, 15, 16]}
        />
        <p className="code-note">
          Key insight: <code>startTransition</code> (line 14-16) wraps the
          setState call, making it interruptible. The <code>isPending</code>{' '}
          state (line 4) lets us show feedback.
        </p>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <p className="demo-instruction">
          Watch the "isPending" indicator as you stream. Try typing - notice how
          the input responds immediately even during heavy rendering.
        </p>
        <StreamingDemo
          level={3}
          batchStrategy="raf"
          useTransition={true}
          useDeferredValue={false}
        />
      </section>
    </Layout>
  )
}
