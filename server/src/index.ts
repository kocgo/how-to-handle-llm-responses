import http from 'node:http'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '0.0.0.0'

type ChunkFormat = 'text' | 'markdown'

interface StreamPayload {
  content: string
  format: ChunkFormat
}

const BASE_SECTIONS: StreamPayload[] = [
  {
    format: 'text',
    content:
      'Here is a mixed response that combines short narrative explanations with rich formatting. The server intentionally emits plain sentences alongside markdown so the UI can exercise different renderers.',
  },
  {
    format: 'markdown',
    content: `## Quick takeaways\n- Streaming content can include **inline emphasis** and bullet points.\n- Mixing plain text with markdown is common for LLMs.\n- Clients need to stitch chunks together without losing formatting.\n`,
  },
  {
    format: 'text',
    content:
      'To mimic how an assistant might pivot, the payload also sprinkles in code commentary before dropping a fenced block.',
  },
  {
    format: 'markdown',
    content: '```ts\nexport async function fetchData() {\n  return Promise.resolve("example payload")\n}\n```\n',
  },
  {
    format: 'text',
    content:
      'The stream finishes with a short recap and an invitation to adjust settings like token count and delay for stress testing.',
  },
]

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function expandSections(words: number): StreamPayload[] {
  const tokens: StreamPayload[] = []
  let iteration = 1

  while (tokens.length < words) {
    for (const section of BASE_SECTIONS) {
      const decoratedContent =
        iteration === 1
          ? section.content
          : `${section.content} (pass ${iteration})`

      const parts = decoratedContent.split(/(\s+)/).filter(part => part.length > 0)

      for (const part of parts) {
        tokens.push({
          content: part,
          format: section.format,
        })

        if (tokens.length >= words) {
          return tokens
        }
      }
    }

    iteration += 1
  }

  return tokens
}

const server = http.createServer(async (req, res) => {
  // Parse URL and query parameters
  const url = new URL(req.url || '/', `http://${req.headers.host}`)

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  // Only handle /stream endpoint
  if (url.pathname !== '/stream') {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Not found' }))
    return
  }

  // Parse query parameters
  const words = Math.min(Math.max(parseInt(url.searchParams.get('words') || '100', 10), 1), 10000)
  const delay = Math.min(Math.max(parseInt(url.searchParams.get('delay') || '50', 10), 1), 1000)

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  })

  // Handle client disconnect
  let aborted = false
  req.on('close', () => {
    aborted = true
  })

  const payloads = expandSections(words)

  // Stream tokens
  for (let i = 0; i < payloads.length && !aborted; i++) {
    const data = JSON.stringify(payloads[i])
    res.write(`data: ${data}\n\n`)

    // Small delay between tokens
    await sleep(delay)
  }

  // Send done signal
  if (!aborted) {
    res.write('data: [DONE]\n\n')
  }

  res.end()
})

server.listen(PORT, HOST, () => {
  console.log(`SSE Server listening on http://${HOST}:${PORT}`)
  console.log(`Stream endpoint: http://${HOST}:${PORT}/stream?words=100&delay=50`)
})
