/**
 * Benchmark options - all toggleable
 */

export type RenderMode = 'text' | 'markdown' | 'mixed';

export type AnimationType =
  | 'fadeIn'
  | 'blurIn'
  | 'typewriter'
  | 'slideInFromLeft'
  | 'fadeAndScale'
  | 'rotateIn'
  | 'bounceIn'
  | 'elastic'
  | 'highlight'
  | 'blurAndSharpen'
  | 'dropIn'
  | 'slideUp'
  | 'wave';

export type ScrollBehavior = 'smooth' | 'instant';

export interface BenchmarkOptions {
  // Batching strategy
  useRafBatching: boolean;

  // React optimizations
  useTransition: boolean;
  useDeferredValue: boolean;

  // CSS optimizations
  useContentVisibility: boolean; // content-visibility: auto
  useContain: boolean; // contain: content
  useWillChange: boolean; // will-change: transform

  // Rendering
  renderMode: RenderMode;

  // Animation (using FlowToken)
  animate: boolean;
  animationType: AnimationType;
  animationDuration: string; // e.g. "0.5s"

  // Auto-scroll
  autoScroll: boolean;
  scrollBehavior: ScrollBehavior;

  // Virtualization
  useVirtualization: boolean;

  // Stream parameters
  words: number;
  delay: number;
}

export const DEFAULT_OPTIONS: BenchmarkOptions = {
  useRafBatching: false,
  useTransition: false,
  useDeferredValue: false,
  useContentVisibility: false,
  useContain: false,
  useWillChange: false,
  renderMode: 'text',
  animate: false,
  animationType: 'fadeIn',
  animationDuration: '0.5s',
  autoScroll: true,
  scrollBehavior: 'smooth',
  useVirtualization: false,
  words: 5000,
  delay: 1,
};

export const ANIMATION_TYPES: AnimationType[] = [
  'fadeIn',
  'blurIn',
  'typewriter',
  'slideInFromLeft',
  'fadeAndScale',
  'rotateIn',
  'bounceIn',
  'elastic',
  'highlight',
  'blurAndSharpen',
  'dropIn',
  'slideUp',
  'wave',
];
