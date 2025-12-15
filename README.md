# LLM Streaming Benchmark

A performance benchmarking tool for testing and optimizing real-time LLM (Large Language Model) streaming responses in React applications. This project helps you understand how different React optimizations, CSS properties, and rendering strategies affect frame rates during high-throughput text streaming.

![React 18](https://img.shields.io/badge/React-18-blue) ![TypeScript 5](https://img.shields.io/badge/TypeScript-5-blue) ![Vite 5](https://img.shields.io/badge/Vite-5-purple)

## 🎯 Purpose

When building chat interfaces or streaming AI responses, maintaining 60 FPS can be challenging due to:

- **Frequent DOM updates** from rapid text chunks
- **Layout thrashing** from continuous content growth
- **Expensive re-renders** during markdown parsing
- **Scroll jank** from auto-scroll behavior

This benchmark lets you toggle various optimizations in real-time and observe their impact on performance via a live FPS chart.

## ✨ Features

### Performance Optimizations
- **RAF Batching** - Buffer incoming chunks and batch updates per animation frame
- **startTransition** - Mark streaming updates as non-urgent (React 18)
- **useDeferredValue** - Defer rendering of stale content during updates

### CSS Optimizations
- **content-visibility: auto** - Skip rendering of off-screen content
- **contain: content** - Isolate layout/paint calculations
- **will-change** - Hint browser about upcoming animations

### Rendering Modes
- **Text** - Plain text, no parsing overhead
- **Mixed** - Only code blocks are syntax highlighted
- **Markdown** - Full markdown parsing with react-markdown

### Animations
- 13 animation types powered by [@nvq/flowtoken](https://github.com/nvqvn/flowtoken)
- Configurable animation duration
- Word-by-word streaming animations

### Virtualization
- **TanStack Virtual** integration for rendering only visible rows
- Handles 100k+ words efficiently
- Works across all render modes (text, mixed, markdown)

## 🏗️ Architecture

```
├── server/           # Express server for SSE streaming
│   └── src/
│       └── index.ts  # SSE endpoint with configurable word count/delay
│
└── ui/               # React frontend
    └── src/
        └── benchmark/
            ├── hooks/
            │   ├── useBenchmarkOptions.ts  # Centralized options state
            │   ├── useStreaming.ts         # SSE streaming with RAF batching
            │   ├── useFpsMetrics.ts        # FPS measurement
            │   └── useAutoScroll.ts        # Auto-scroll behavior
            ├── components/
            │   ├── FpsChart.tsx            # Sparkline FPS visualization
            │   └── StreamingFadeInText.tsx # Animated text rendering
            ├── utils/
            │   └── parsers.ts              # Memoized content parsing
            ├── Dashboard.tsx               # Main benchmark UI
            └── OutputRenderer.tsx          # Virtualized content renderer
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/how-to-handle-llm-responses.git
cd how-to-handle-llm-responses

# Install dependencies for both packages (from repo root)
npm install
```

### Running the Development Server

**Terminal 1 - Start the streaming server:**
```bash
npm --workspace server run dev
```

**Terminal 2 - Start the UI:**
```bash
npm --workspace ui run dev
```

Open http://localhost:5173 in your browser.

## 📊 Using the Benchmark

1. **Configure stream parameters:**
   - **Words** - Total words to stream (100 - 1,000,000)
   - **Delay** - Milliseconds between chunks (0-50ms)

2. **Enable optimizations** you want to test

3. **Click "Run"** and observe the FPS chart

4. **Compare** different combinations to find optimal settings for your use case

### Recommended Testing

For realistic LLM simulation:
- Words: 5,000-10,000
- Delay: 1-5ms

For stress testing:
- Words: 100,000+
- Delay: 0ms
- Enable virtualization

## 🔧 Key Optimizations Explained

### RAF Batching
Instead of updating state on every SSE chunk, buffers chunks and flushes once per frame:
```typescript
// Without batching: 100+ state updates per frame
// With batching: 1 state update per frame
```

### Virtualization (TanStack Virtual)
Only renders visible rows in the viewport:
- Maintains smooth 60 FPS with 100k+ words
- Uses memoized row estimation for mixed content
- Handles text/mixed/markdown modes

### Lightweight Markdown
Skips expensive syntax highlighting in code blocks:
- ~3x faster parsing
- Ideal for real-time streaming

## 🛠️ Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.2 | UI framework |
| Vite | 5.0 | Build tool |
| TypeScript | 5.1 | Type safety |
| @nvq/flowtoken | 2.0.6 | Text animations |
| @tanstack/react-virtual | 3.10.8 | Virtualization |
| react-markdown | 9.0.1 | Markdown parsing |
| react-syntax-highlighter | 15.5 | Code highlighting |

## 📈 Performance Tips

Based on benchmark results:

1. **Always enable RAF Batching** - Single biggest FPS improvement
2. **Use Virtualization** for long content (>1000 words)
3. **Prefer "Mixed" mode** over full Markdown for streaming
4. **Enable Lightweight MD** during active streaming
5. **Disable auto-scroll** if not needed (saves ~5 FPS)
6. **Use `contain: content`** for isolated output containers

## 🧪 Testing

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run tests
npm --workspace ui run test
```

## 📝 API

### Server Endpoints

**GET** `/api/stream?words={n}&delay={ms}`

Server-Sent Events stream returning words with configurable parameters.

### Benchmark Options

```typescript
interface BenchmarkOptions {
  // Batching
  useRafBatching: boolean;
  
  // React optimizations
  useTransition: boolean;
  useDeferredValue: boolean;
  
  // CSS optimizations
  useContentVisibility: boolean;
  useContain: boolean;
  useWillChange: boolean;
  
  // Rendering
  renderMode: 'text' | 'mixed' | 'markdown';
  useLightweightMarkdown: boolean;
  
  // Animation
  animate: boolean;
  animationType: AnimationType;
  animationDuration: string;
  
  // Scroll & Virtualization
  autoScroll: boolean;
  useVirtualization: boolean;
  
  // Stream params
  words: number;
  delay: number;
}
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License

---

**Built for testing React performance with streaming LLM responses.**
