# Chasing 240 FPS on LLM Chats

I have been using LLM chat applications and dev assistant tools for a while now (ChatGPT, Claude, Copilot, Cline, RooCode, Cursor etc) and developing a few and I noticed something: some of them lag on Chat UI components. 

After a point in chat; cursor starts stuttering, scrolling feels sluggish, and user inputs get blocked or delayed, sometimes even crashing the entire tab.

It just makes the application feel... cheap.

But are there good examples? They feel buttery smooth; for a while, then they start to lag/stutter as well. Overall, it is getting better nowadays in all those applications I have mentioned.

So I started wondering: Is 60 FPS even achievable? What about 240 FPS for those of us who are obsessive about frame rates?

## TLDR
I built a benchmark suite to test various optimizations for streaming LLM responses in a React UI. Here are the key takeaways:

1) Build a proper state first, then optimize the rendering later. Ideally, do it without React. You can use Zustand to build the whole state outside React.

2) Do not try to optimize React re-renders or hooks, focus on windowing.
Wins on React internals are minimal (memoization, useTransition, useDeferredValue etc) compared to windowing.

3) Focus on CRP (Critical Rendering Path) optimizations using CSS containment and content-visibility. 

4) If you are designing the Chat Bot yourself, consider not responding with markdown at all. It is expensive to parse and render.


## How LLMs Stream Works

Before diving into optimizations, let's understand what we're dealing with. LLMs don't return a complete response in one shot—they stream it in chunks using Server-Sent Events (SSE).

Do not ask me why, ChatGPT started it.

Lets take a look at the most basic LLM Stream response handling with `fetch`:

```javascript
async function streamLLMResponse(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) {
      done = true;
      break;
    }
    const chunk = new TextDecoder().decode(value);
    // Process the chunk (can be one or multiple words)
    console.log(chunk);
  }
}
```

## How to handle the chunk in React and why it lags?
In a React application, you might handle each incoming chunk by updating the component's state. The most straightforward way is to append each chunk to a state variable:

```javascript
const [response, setResponse] = useState("");

async function streamLLMResponse(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();
  let done = false;

  while (!done) {
    const { value, done: streamDone } = await reader.read();
    if (streamDone) {
      done = true;
      break;
    }
    const chunk = new TextDecoder().decode(value);
    setResponse((prev) => prev + chunk); // Update state with each chunk
  }
}
```

Lets take a look at why this approach can lead to lag and stuttering:
(Raw text with React Set State approach):

// GIF will come here

Result: As state (basically chat history) grows, FPS drops significantly.

Min FPS: 0
Achieved in: 10 seconds

## Optimizations

I have built a benchmark suite to test various optimizations for streaming LLM responses.

It includes:
- A minimal Node + TypeScript server that streams words with configurable delay. (basically simulating an LLM SSR stream)
- A React + Vite + TypeScript frontend that implements various optimizations for handling and rendering the streamed response.

Going forward, I will describe each optimization I have tested and their impact on performance. Performance is only measured in FPS (Frames Per Second) during streaming. RAM usage varies between optimizations.

### RAF Batching

The first optimization is to batch incoming chunks using `requestAnimationFrame` (RAF). Instead of updating the state with each chunk, we buffer the chunks and update the state once per animation frame.

It is not that complicated, you keep a buffer string in a Ref and on each chunk, you append to that buffer. Then you schedule a RAF callback to flush the buffer to a React State.

```javascript
const bufferRef = useRef("");

async function streamLLMResponse(url) {
  const response = await fetch(url);
  const reader = response.body.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    
    bufferRef.current += new TextDecoder().decode(value); // Collect Collect!
    
    requestAnimationFrame(() => {
      if (bufferRef.current) {
        setResponse(prev => prev + bufferRef.current); // Set the state and flush!
        bufferRef.current = "";
      }
    });
  }
}
```

Lets see how this performs:

Min FPS: 15
Achieved in: 180 seconds

A bit better. Still far from great.