import React from 'react'
import { useAnimatedText } from '../hooks/useAnimatedText'

interface PlainTextRendererProps {
  content: string
  className?: string
  animateWords?: boolean
}

export function PlainTextRenderer({
  content,
  className,
  animateWords = false,
}: PlainTextRendererProps) {
  const animatedContent = animateWords ? useAnimatedText(content, true) : content

  return (
    <pre className={`plain-text-output ${className ?? ''}`.trim()}>
      {animatedContent}
    </pre>
  )
}
