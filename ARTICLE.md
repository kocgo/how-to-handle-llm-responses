# Chasing 240 FPS on LLM Chats: It needs to go BRRrrrrr

I have been using LLM chat applications and dev assistant tools for a while now (ChatGPT, Claude, Copilot, Cline, RooCode, Cursor etc) and developing a few and I noticed something: some of them lag on Chat UI components. 

After a point in chat; cursor starts stuttering, scrolling feels sluggish, and user inputs get blocked or delayed, sometimes even crashing the entire tab.

It just makes the application feel... cheap.

But are there good examples? They feel buttery smooth; for a while, then they start to lag/stutter as well. Overall, it is getting better nowadays in all those applications I have mentioned.

So I started wondering: Is 60 FPS even achievable? What about 240 FPS for those of us who are obsessive about frame rates?

## TLDR
I built a benchmark suite to test various optimizations for streaming LLM responses in a React UI. Here are the key takeaways:

1) Do not try to optimize React re-renders or hooks, focus on windowing.

2) Focus on CRP (Critical Rendering Path) optimizations using CSS containment and content-visibility. 

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
    // Process the chunk (e.g., append to UI)
    console.log(chunk);
  }
}
```

