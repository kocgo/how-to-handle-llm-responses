export type BatchStrategy = 'none' | 'raf' | 'interval'
export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface StreamChunk {
  content: string
}

export interface PerformanceMetrics {
  fps: number
  inputLatency: number
  renderCount: number
}

export interface LevelConfig {
  level: Level
  name: string
  description: string
  batchStrategy: BatchStrategy
  useTransition: boolean
  useDeferredValue: boolean
  useWindowing?: boolean
}

export const LEVEL_CONFIGS: LevelConfig[] = [
  {
    level: 1,
    name: 'Naive',
    description: 'setState on every chunk',
    batchStrategy: 'none',
    useTransition: false,
    useDeferredValue: false,
  },
  {
    level: 2,
    name: 'Batched',
    description: 'useRef + requestAnimationFrame',
    batchStrategy: 'raf',
    useTransition: false,
    useDeferredValue: false,
  },
  {
    level: 3,
    name: 'Transition',
    description: 'startTransition for setState',
    batchStrategy: 'raf',
    useTransition: true,
    useDeferredValue: false,
  },
  {
    level: 4,
    name: 'Deferred',
    description: 'useDeferredValue for render',
    batchStrategy: 'raf',
    useTransition: false,
    useDeferredValue: true,
  },
  {
    level: 5,
    name: 'Combined',
    description: 'All optimizations',
    batchStrategy: 'raf',
    useTransition: true,
    useDeferredValue: true,
  },
  {
    level: 6,
    name: 'Windowed',
    description: 'Virtualized rendering',
    batchStrategy: 'raf',
    useTransition: true,
    useDeferredValue: true,
    useWindowing: true,
  },
  {
    level: 7,
    name: 'CSS Containment',
    description: 'content-visibility + contain',
    batchStrategy: 'raf',
    useTransition: true,
    useDeferredValue: true,
    useWindowing: true,
  },
]
