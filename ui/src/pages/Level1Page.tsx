import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CODE_SAMPLE = `// ❌ Problem: setState on EVERY chunk
function NaiveStreaming() {
  const [text, setText] = useState('');

  function onChunk(token: string) {
    setText(prev => prev + token);  // 🔴 Re-render on every single token!
  }

  return <MarkdownRenderer content={text} />;
}`

export function Level1Page() {
  return (
    <Layout currentLevel={1}>
      <header className="page-header">
        <h1>Level 1: The Naive Approach</h1>
        <p className="subtitle">setState on every chunk</p>
      </header>

      <section className="explanation">
        <h2>The Problem</h2>
        <p>
          When streaming tokens from an LLM, the most intuitive approach is to
          call <code>setState</code> every time a new token arrives. This seems
          logical - we want to show the user each token as it comes in.
        </p>
        <p>
          However, this creates a serious performance problem: <strong>every
          setState call triggers a re-render</strong>. If you're receiving 20-50
          tokens per second, that's 20-50 re-renders per second. Each re-render
          includes:
        </p>
        <ul>
          <li>React's reconciliation process</li>
          <li>Markdown parsing (which gets slower as text grows)</li>
          <li>Syntax highlighting for code blocks</li>
          <li>DOM updates</li>
        </ul>
        <p>
          This blocks the main thread, making the UI unresponsive. Try typing in
          the input below while streaming - you'll notice significant lag.
        </p>
      </section>

      <section className="explanation">
        <h2>What You'll See</h2>
        <ul>
          <li><strong>Low FPS</strong>: The frame rate drops significantly during streaming</li>
          <li><strong>Input lag</strong>: Typing in the test input feels sluggish</li>
          <li><strong>High render count</strong>: Watch the render count climb rapidly</li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CODE_SAMPLE}
          language="tsx"
          title="NaiveStreaming.tsx"
          highlightLines={[6]}
        />
        <p className="code-note">
          The highlighted line shows the problem: calling <code>setText</code>{' '}
          on every single token.
        </p>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <StreamingDemo
          level={1}
          batchStrategy="none"
          useTransition={false}
          useDeferredValue={false}
        />
      </section>
    </Layout>
  )
}
