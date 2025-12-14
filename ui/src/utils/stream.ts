import { StreamChunk } from '../types'

interface FetchStreamOptions {
  words?: number
  delay?: number
  signal?: AbortSignal
  onChunk: (token: string) => void
  onDone: () => void
  onError: (error: Error) => void
}

export async function fetchStream({
  words = 100,
  delay = 50,
  signal,
  onChunk,
  onDone,
  onError,
}: FetchStreamOptions): Promise<void> {
  try {
    const response = await fetch(`/stream?words=${words}&delay=${delay}`, {
      signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE messages
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || '' // Keep incomplete message in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6) // Remove 'data: ' prefix

          if (data === '[DONE]') {
            onDone()
            return
          }

          try {
            const chunk: StreamChunk = JSON.parse(data)
            onChunk(chunk.token)
          } catch {
            // Skip invalid JSON
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.startsWith('data: ')) {
      const data = buffer.slice(6)
      if (data === '[DONE]') {
        onDone()
      } else {
        try {
          const chunk: StreamChunk = JSON.parse(data)
          onChunk(chunk.token)
        } catch {
          // Skip invalid JSON
        }
      }
    }

    onDone()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Aborted by user, not an error
      return
    }
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}
