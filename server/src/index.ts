import http from 'node:http'
import { URL } from 'node:url'

const PORT = Number(process.env.PORT || 3001)
const HOST = process.env.HOST || '0.0.0.0'

// Word list for simulating LLM output
const PROSE_WORDS = [
  'The', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'although', 'because', 'since',
  'unless', 'while', 'where', 'when', 'which', 'who', 'whom', 'whose', 'that', 'this',
  'these', 'those', 'I', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their',
  'mine', 'yours', 'hers', 'ours', 'theirs', 'what', 'which', 'who', 'whom', 'whose',
  'data', 'function', 'component', 'state', 'props', 'render', 'effect', 'hook',
  'React', 'TypeScript', 'JavaScript', 'async', 'await', 'promise', 'callback',
  'streaming', 'response', 'request', 'API', 'endpoint', 'server', 'client',
  'performance', 'optimization', 'batching', 'transition', 'deferred', 'value',
  'user', 'interface', 'experience', 'responsive', 'interactive', 'smooth',
  'example', 'implementation', 'pattern', 'approach', 'solution', 'problem',
]

const MARKDOWN_SYNTAX = [
  '# ', '## ', '### ', '**', '*', '- ', '1. ', '> ', '`', '```',
  '[link]', '(url)', '![image]', '---', '|', '\n', '\n\n',
]

const CODE_TOKENS = [
  'const', 'let', 'var', 'function', 'return', '=>', 'async', 'await',
  'import', 'export', 'default', 'from', 'if', 'else', 'for', 'while',
  'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw',
  'new', 'this', 'class', 'extends', 'super', 'static', 'get', 'set',
  'typeof', 'instanceof', 'in', 'of', 'delete', 'void', 'null', 'undefined',
  'true', 'false', 'NaN', 'Infinity', 'console.log', 'useState', 'useEffect',
  'useRef', 'useCallback', 'useMemo', 'useTransition', 'useDeferredValue',
  '()', '{}', '[]', ';', ':', ',', '.', '=', '===', '!==', '&&', '||',
]

const PUNCTUATION = ['.', ',', '!', '?', ':', ';', '-', '...', '(', ')', '"', "'"]

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateToken(): string {
  const rand = Math.random()
  if (rand < 0.5) {
    return getRandomElement(PROSE_WORDS)
  } else if (rand < 0.7) {
    return getRandomElement(CODE_TOKENS)
  } else if (rand < 0.85) {
    return getRandomElement(MARKDOWN_SYNTAX)
  } else {
    return getRandomElement(PUNCTUATION)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
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

  // Stream tokens
  for (let i = 0; i < words && !aborted; i++) {
    const token = generateToken()
    const data = JSON.stringify({ token })
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
