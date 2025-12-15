import { useState, useEffect, useRef } from 'react';
import { BenchmarkOptions, DEFAULT_OPTIONS, ANIMATION_TYPES, AnimationType } from './types';
import { useStreaming } from './useStreaming';
import { useFpsMetrics } from './useFpsMetrics';
import { FpsChart } from './FpsChart';
import { OutputRenderer } from './OutputRenderer';

export function Dashboard() {
  const [options, setOptions] = useState<BenchmarkOptions>(DEFAULT_OPTIONS);
  const [testInput, setTestInput] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const streaming = useStreaming(options);
  const fps = useFpsMetrics(streaming.isStreaming);

  // Auto-scroll (only when not using virtualization - virtualization handles its own scroll)
  useEffect(() => {
    if (options.autoScroll && !options.useVirtualization && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [streaming.displayText, options.autoScroll, options.useVirtualization]);

  const toggle = (key: keyof BenchmarkOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setParam = (key: keyof BenchmarkOptions, value: number) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

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
                <span className="toggle-name">RAF Batching</span>
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
                <span className="toggle-name">startTransition</span>
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
                <span className="toggle-name">useDeferredValue</span>
                <span className="toggle-desc">Defer rendering of stale content</span>
              </div>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useMillionJs}
                onChange={() => toggle('useMillionJs')}
              />
              <div className="toggle-info">
                <span className="toggle-name">Million.js</span>
                <span className="toggle-desc">Block virtual DOM (70% faster)</span>
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
                <span className="toggle-name">content-visibility</span>
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
                <span className="toggle-name">contain: content</span>
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
                <span className="toggle-name">will-change</span>
                <span className="toggle-desc">Hint browser about animations</span>
              </div>
            </label>
          </section>

          <section className="control-section">
            <h2>Rendering</h2>

            <div className="select-option">
              <div className="select-header">
                <span>Render Mode</span>
              </div>
              <div className="style-buttons">
                <button
                  className={`style-btn ${options.renderMode === 'text' ? 'active' : ''}`}
                  onClick={() => setOptions((prev) => ({ ...prev, renderMode: 'text' }))}
                  title="Plain text, no parsing"
                >
                  Text
                </button>
                <button
                  className={`style-btn ${options.renderMode === 'mixed' ? 'active' : ''}`}
                  onClick={() => setOptions((prev) => ({ ...prev, renderMode: 'mixed' }))}
                  title="Only code blocks highlighted"
                >
                  Mixed
                </button>
                <button
                  className={`style-btn ${options.renderMode === 'markdown' ? 'active' : ''}`}
                  onClick={() => setOptions((prev) => ({ ...prev, renderMode: 'markdown' }))}
                  title="Full markdown parsing"
                >
                  Markdown
                </button>
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
                  <span className="toggle-name">Lightweight MD</span>
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
                <span className="toggle-name">Animate</span>
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
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        animationType: e.target.value as AnimationType,
                      }))
                    }
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
                        onClick={() => setOptions((prev) => ({ ...prev, animationDuration: dur }))}
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
                <strong>{options.words.toLocaleString()}</strong>
              </div>
              <input
                type="range"
                min="100"
                max="1000000"
                step="1000"
                value={options.words}
                onChange={(e) => setParam('words', Number(e.target.value))}
              />
            </div>

            <div className="slider-option">
              <div className="slider-header">
                <span>Delay</span>
                <strong>{options.delay}ms</strong>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={options.delay}
                onChange={(e) => setParam('delay', Number(e.target.value))}
              />
            </div>
          </section>

          <section className="control-section">
            <h2>Scroll</h2>
            
            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.autoScroll}
                onChange={(e) => setOptions((prev) => ({ ...prev, autoScroll: e.target.checked }))}
              />
              <span>Auto-scroll</span>
            </label>

            <label className="toggle-option">
              <input
                type="checkbox"
                checked={options.useVirtualization}
                onChange={() => toggle('useVirtualization')}
              />
              <span>Virtualize (TanStack)</span>
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
              useMillionJs={options.useMillionJs}
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
