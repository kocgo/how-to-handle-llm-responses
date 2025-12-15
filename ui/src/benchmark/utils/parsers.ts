import { RenderMode } from '../types';

export interface ParsedSegment {
  type: 'text' | 'markdown';
  content: string;
}

// Cache for parsed segments to avoid re-parsing
const segmentCache = new WeakMap<object, { content: string; segments: ParsedSegment[] }>();

/**
 * Parse mixed content into text and markdown segments
 * Results are cached to avoid re-parsing on every render
 */
export function parseMixedSegments(content: string, cacheKey: object): ParsedSegment[] {
  const cached = segmentCache.get(cacheKey);
  if (cached && cached.content === content) {
    return cached.segments;
  }
  
  const segments: ParsedSegment[] = [];
  const regex = /<markdown>([\s\S]*?)<\/markdown>/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'markdown', content: match[1] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < content.length) {
    segments.push({ type: 'text', content: content.slice(lastIndex) });
  }
  
  segmentCache.set(cacheKey, { content, segments });
  return segments;
}

/**
 * Split content into blocks for virtualization
 */
export function splitIntoBlocks(content: string, mode: RenderMode): string[] {
  if (!content) return [];
  
  if (mode === 'text') {
    return content.split('\n');
  }
  
  if (mode === 'markdown') {
    const blocks: string[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let match;
    
    const segments: { type: 'code' | 'text'; content: string }[] = [];
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      segments.push({ type: 'code', content: match[0] });
      lastIndex = codeBlockRegex.lastIndex;
    }
    if (lastIndex < content.length) {
      segments.push({ type: 'text', content: content.slice(lastIndex) });
    }
    
    for (const segment of segments) {
      if (segment.type === 'code') {
        blocks.push(segment.content);
      } else {
        const paragraphs = segment.content.split(/\n\n+/).filter(p => p.trim());
        blocks.push(...paragraphs);
      }
    }
    
    return blocks.length > 0 ? blocks : [content];
  }
  
  if (mode === 'mixed') {
    const blocks: string[] = [];
    const regex = /<markdown>([\s\S]*?)<\/markdown>/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        const textContent = content.slice(lastIndex, match.index);
        const lines = textContent.split('\n').filter(l => l.trim());
        blocks.push(...lines.map(l => `__TEXT__${l}`));
      }
      blocks.push(`__MARKDOWN__${match[1]}`);
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < content.length) {
      const textContent = content.slice(lastIndex);
      const lines = textContent.split('\n').filter(l => l.trim());
      blocks.push(...lines.map(l => `__TEXT__${l}`));
    }
    
    return blocks.length > 0 ? blocks : [`__TEXT__${content}`];
  }
  
  return [content];
}
