import { useRef, useState } from 'react';
import { ANIMATION_TYPES, AnimationType, RenderMode } from './types';
import { useBenchmarkOptions, useStreaming, useFpsMetrics, useAutoScroll } from './hooks';
import { FpsChart, InfoTooltip } from './components';
import { OutputRenderer } from './OutputRenderer';

export function Dashboard() {
  const { options, toggle, setNumber, set } = useBenchmarkOptions();
  const [testInput, setTestInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const streaming = useStreaming(options);
  const fps = useFpsMetrics(streaming.isStreaming);
  
  // Auto-scroll hook
  useAutoScroll(outputRef, streaming.displayText, {
    enabled: options.autoScroll,
    useVirtualization: options.useVirtualization,
  });

  const handleRun = () => {
    streaming.reset();
    streaming.start();
  };

  return (
    <div className="app">
      <header className="header">
        <h1>LLM Streaming Benchmark</h1>
        <p>Toggle options to see how they affect FPS</p>
      </header>

      <div className="main">
        {/* Controls */}
        <div className="controls">
          <section className="control-section">
            <h2>Optimizations</h2>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useRafBatching}
                onChange={() => toggle('useRafBatching')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">RAF Batching</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>requestAnimationFrame Batching</strong></p>
                      <p>Instead of updating React state on every SSE chunk (which can be 100+ times per frame), this buffers all incoming chunks and flushes them once per animation frame (~60 times/second).</p>
                      <p><strong>Impact:</strong> Single biggest FPS improvement. Essential for high-throughput streaming.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Buffer chunks, update once per frame</span>
              </div>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useTransition}
                onChange={() => toggle('useTransition')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">startTransition</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>React 18 startTransition</strong></p>
                      <p>Wraps state updates in <code>startTransition()</code>, marking them as non-urgent. React can interrupt these updates to handle more urgent work (like user input).</p>
                      <p><strong>Impact:</strong> Improves input responsiveness during streaming. Shows <code>isPending</code> state while transitioning.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Mark updates as non-urgent</span>
              </div>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useDeferredValue}
                onChange={() => toggle('useDeferredValue')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">useDeferredValue</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>React 18 useDeferredValue</strong></p>
                      <p>Returns a deferred version of the text that "lags behind" the actual value. React will first render with stale content, then re-render with fresh content in the background.</p>
                      <p><strong>Impact:</strong> Prevents UI from freezing during heavy renders. Shows "stale" indicator when deferred value is behind.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Defer rendering of stale content</span>
              </div>
            </label>
          </section>

          <section className="control-section">
            <h2>CSS Optimizations</h2>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useContentVisibility}
                onChange={() => toggle('useContentVisibility')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">content-visibility</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>CSS content-visibility: auto</strong></p>
                      <p>Tells the browser to skip rendering of off-screen content entirely. The browser estimates the size and only renders content when it enters the viewport.</p>
                      <p><strong>Impact:</strong> Major improvement for long content. Browser skips layout/paint for hidden elements.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Skip rendering off-screen content</span>
              </div>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useContain}
                onChange={() => toggle('useContain')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">contain: content</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>CSS Containment</strong></p>
                      <p>Applies <code>contain: content</code> which tells the browser that this element's layout, style, and paint are independent from the rest of the page.</p>
                      <p><strong>Impact:</strong> Prevents layout thrashing. Changes inside the container don't trigger full page relayout.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Isolate layout/paint from rest</span>
              </div>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useWillChange}
                onChange={() => toggle('useWillChange')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">will-change</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>CSS will-change Property</strong></p>
                      <p>Applies <code>will-change: transform, opacity</code> to hint the browser that these properties will animate, allowing it to optimize ahead of time (e.g., promote to GPU layer).</p>
                      <p><strong>Impact:</strong> Can improve animation smoothness but uses more memory. Best for animated content.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Hint browser about animations</span>
              </div>
            </label>
          </section>

          <section className="control-section">
            <h2>Rendering</h2>

            <div className="select-option">
              <div className="select-header">
                <span>Render Mode</span>
                <InfoTooltip content={
                  <>
                    <p><strong>Text:</strong> Plain text, no parsing. Fastest option.</p>
                    <p><strong>Mixed:</strong> Only code blocks are parsed and syntax-highlighted. Good balance.</p>
                    <p><strong>Markdown:</strong> Full markdown parsing with react-markdown. Most features, slowest.</p>
                  </>
                } />
              </div>
              <div className="style-buttons">
                {(['text', 'mixed', 'markdown'] as RenderMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`style-btn ${options.renderMode === mode ? 'active' : ''}`}
                    onClick={() => set('renderMode', mode)}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {(options.renderMode === 'mixed' || options.renderMode === 'markdown') && (
              <label className="toggle-option">
                <input
                  type="checkbox"
                  checked={options.useLightweightMarkdown}
                  onChange={() => toggle('useLightweightMarkdown')}
                />
                <div className="toggle-info">
                  <span className="toggle-name-row">
                    <span className="toggle-name">Lightweight MD</span>
                    <InfoTooltip content={
                      <>
                        <p><strong>Lightweight Markdown Mode</strong></p>
                        <p>Skips expensive syntax highlighting in code blocks. Code is displayed with basic styling but without language-specific coloring.</p>
                        <p><strong>Impact:</strong> ~3x faster markdown parsing. Recommended during active streaming.</p>
                      </>
                    } />
                  </span>
                  <span className="toggle-desc">Skip syntax highlighting (faster)</span>
                </div>
              </label>
            )}

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.animate}
                onChange={() => toggle('animate')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">Animate</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>Word-by-Word Animation</strong></p>
                      <p>Uses @nvq/flowtoken library to animate each word as it appears with smooth CSS transitions. Creates a typewriter-like effect.</p>
                      <p><strong>Impact:</strong> Visual enhancement but adds rendering overhead. 13 animation types available.</p>
                    </>
                  } />
                </span>
                <span className="toggle-desc">Smooth word-by-word animation</span>
              </div>
            </label>

            {options.animate && (
              <>
                <div className="select-option nested">
                  <div className="select-header">
                    <span>Animation Type</span>
                  </div>
                  <select
                    className="animation-select"
                    value={options.animationType}
                    onChange={(e) => set('animationType', e.target.value as AnimationType)}
                  >
                    {ANIMATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="select-option nested">
                  <div className="select-header">
                    <span>Duration</span>
                  </div>
                  <div className="style-buttons">
                    {['0.3s', '0.5s', '0.8s', '1s'].map((dur) => (
                      <button
                        key={dur}
                        className={`style-btn ${options.animationDuration === dur ? 'active' : ''}`}
                        onClick={() => set('animationDuration', dur)}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          <section className="control-section">
            <h2>Stream</h2>

            <div className="slider-option">
              <div className="slider-header">
                <span>Words</span>
                <InfoTooltip content={
                  <>
                    <p><strong>Total Words to Stream</strong></p>
                    <p>Number of words the server will send. Higher values stress-test rendering performance.</p>
                    <p><strong>Tip:</strong> Use 5,000-10,000 for realistic LLM simulation. Use 100,000+ for stress testing.</p>
                  </>
                } />
                <strong>{options.words.toLocaleString()}</strong>
              </div>
              <input
                type="range"
                min="100"
                max="1000000"
                step="1000"
                value={options.words}
                onChange={(e) => setNumber('words', Number(e.target.value))}
              />
            </div>

            <div className="slider-option">
              <div className="slider-header">
                <span>Delay</span>
                <InfoTooltip content={
                  <>
                    <p><strong>Delay Between Chunks</strong></p>
                    <p>Milliseconds to wait between sending each word. Lower values simulate faster streaming.</p>
                    <p><strong>Tip:</strong> Use 0ms for maximum stress. Use 1-5ms for realistic LLM speeds.</p>
                  </>
                } />
                <strong>{options.delay}ms</strong>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={options.delay}
                onChange={(e) => setNumber('delay', Number(e.target.value))}
              />
            </div>
          </section>

          <section className="control-section">
            <h2>Scroll</h2>
            
            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.autoScroll}
                onChange={() => toggle('autoScroll')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">Auto-scroll</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>Automatic Scrolling</strong></p>
                      <p>Automatically scrolls to bottom as new content arrives, keeping the latest text visible.</p>
                      <p><strong>Impact:</strong> ~5 FPS overhead from scroll operations. Disable if not needed.</p>
                    </>
                  } />
                </span>
              </div>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useVirtualization}
                onChange={() => toggle('useVirtualization')}
              />
              <div className="toggle-info">
                <span className="toggle-name-row">
                  <span className="toggle-name">Virtualize (TanStack)</span>
                  <InfoTooltip content={
                    <>
                      <p><strong>TanStack Virtual Row Virtualization</strong></p>
                      <p>Only renders visible rows in the viewport, keeping DOM size constant regardless of content length. Essential for 100k+ words.</p>
                      <p><strong>Impact:</strong> Maintains 60 FPS even with massive content. Works with all render modes.</p>
                    </>
                  } />
                </span>
              </div>
            </label>
          </section>

          <div className="control-actions">
            <button
              className="btn btn-primary"
              onClick={handleRun}
              disabled={streaming.isStreaming}
            >
              {streaming.isStreaming ? 'Running...' : 'Run'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={streaming.stop}
              disabled={!streaming.isStreaming}
            >
              Stop
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="output-panel">
          <div className="metrics-bar">
            <FpsChart history={fps.history} current={fps.current} />
            <div className="metric">
              <span
                className="metric-value"
                style={{
                  color:
                    fps.current >= 50
                      ? '#22c55e'
                      : fps.current >= 30
                        ? '#eab308'
                        : '#ef4444',
                }}
              >
                {fps.current}
              </span>
              <span className="metric-label">FPS</span>
            </div>
            <div className="metric">
              <span className="metric-value">{streaming.charCount.toLocaleString()}</span>
              <span className="metric-label">chars</span>
            </div>
            {options.useTransition && (
              <div className={`status-badge ${streaming.isPending ? 'pending' : ''}`}>
                isPending: {streaming.isPending ? 'true' : 'false'}
              </div>
            )}
            {options.useDeferredValue && (
              <div className={`status-badge ${streaming.isStale ? 'stale' : ''}`}>
                isStale: {streaming.isStale ? 'true' : 'false'}
              </div>
            )}
          </div>

          <div className="test-input-wrapper">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Type here to test UI responsiveness..."
              className="test-input"
            />
          </div>

          <div
            ref={outputRef}
            className={`output ${streaming.isPending ? 'pending' : ''} ${streaming.isStale ? 'stale' : ''}`}
            style={{
              contentVisibility: options.useContentVisibility ? 'auto' : 'visible',
              contain: options.useContain ? 'content' : 'none',
              willChange: options.useWillChange ? 'transform, opacity' : 'auto',
              // When virtualization is enabled, disable outer scroll - the virtualized container handles it
              overflow: options.useVirtualization ? 'hidden' : undefined,
            }}
          >
            <OutputRenderer
              content={streaming.displayText}
              renderMode={options.renderMode}
              animate={options.animate}
              animationType={options.animationType}
              animationDuration={options.animationDuration}
              useVirtualization={options.useVirtualization}
              autoScroll={options.autoScroll}
              useLightweightMarkdown={options.useLightweightMarkdown}
              cssOptimizations={{
                useContentVisibility: options.useContentVisibility,
                useContain: options.useContain,
                useWillChange: options.useWillChange,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
