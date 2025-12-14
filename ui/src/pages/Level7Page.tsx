import React from 'react'
import { Layout } from '../components/Layout'
import { CodeBlock } from '../components/CodeBlock'
import { StreamingDemo } from '../components/StreamingDemo'

const CSS_SNIPPET = `.llmChunk {
  content-visibility: auto;
  contain-intrinsic-size: auto 300px;
  contain: content;
}

.chat-scroller {
  overflow-anchor: none;
}

document.addEventListener('contentvisibilityautostatechange', (event) => {
  if (event.target.matches('.llmChunk') && event.detail.visible) {
    // Run expensive work (highlighting, math) only when on-screen
    hydrateChunk(event.target)
  }
});`

export function Level7Page() {
  return (
    <Layout currentLevel={7}>
      <header className="page-header">
        <h1>Level 7: CSS Containment</h1>
        <p className="subtitle">Skip work for offscreen content and localize paints</p>
      </header>

      <section className="explanation">
        <h2>The Problem</h2>
        <p>
          After windowing, the biggest wins for ultra-long responses come from letting the browser
          <strong> skip work for offscreen chunks </strong> and isolating layout/paint so updates do not ripple
          through the entire page. Long markdown blocks and code fences keep burning CPU even when the
          user will not see them for minutes of scrolling.
        </p>
      </section>

      <section className="explanation">
        <h2>The Solution</h2>
        <p>
          Layer on <strong>content-visibility</strong> with <strong>contain-intrinsic-size</strong> so the browser can
          defer style/layout/paint for offscreen bubbles while keeping a stable placeholder size. Combine it with
          <strong>contain: content</strong> to reduce the blast radius of reflows and <strong>overflow-anchor: none</strong> to
          keep scroll position steady while new tokens stream in.
        </p>
        <ul>
          <li>
            <strong>content-visibility: auto</strong> — skip style/layout/paint work until the element nears the viewport.
          </li>
          <li>
            <strong>contain-intrinsic-size</strong> — provide a fallback height so skipped elements still reserve space.
          </li>
          <li>
            <strong>contain: content</strong> — localize recalculations to each message bubble or chunk.
          </li>
          <li>
            <strong>overflow-anchor: none</strong> — opt out of scroll anchoring in the streaming area.
          </li>
        </ul>
      </section>

      <section className="code-section">
        <h2>Implementation</h2>
        <CodeBlock
          code={CSS_SNIPPET}
          language="css"
          title="llm-chunk.css"
          highlightLines={[2, 3, 4, 7, 8, 10, 11, 12, 13, 14]}
        />
        <p className="code-note">
          Apply <code>.llmChunk</code> to every streamed block (markdown, code, plain text) and
          <code>.chat-scroller</code> to the scroll container. Hook <code>contentvisibilityautostatechange</code> to defer
          heavy extras like syntax highlighting until the element becomes visible.
        </p>
      </section>

      <section className="summary-section">
        <h2>Why It Matters</h2>
        <div className="callout-grid">
          <div className="callout-card">
            <h3>Less layout thrash</h3>
            <p>Containment keeps reflows scoped to the chunk that changed instead of the whole page.</p>
          </div>
          <div className="callout-card">
            <h3>Cheaper offscreen content</h3>
            <p>Offscreen markdown no longer burns CPU — it activates when near the viewport.</p>
          </div>
          <div className="callout-card">
            <h3>Steady scrolling</h3>
            <p>Disabling scroll anchoring prevents jumps while tokens stream in or sizes settle.</p>
          </div>
        </div>
      </section>

      <section className="demo-section">
        <h2>Live Demo</h2>
        <p className="demo-instruction">
          Stream a long response, switch tabs, and scroll. Watch how offscreen chunks stay lightweight until
          they enter view, and scroll position stays stable even as new content arrives.
        </p>
        <StreamingDemo
          level={7}
          batchStrategy="raf"
          useTransition={true}
          useDeferredValue={true}
          useWindowing={true}
        />
      </section>
    </Layout>
  )
}
