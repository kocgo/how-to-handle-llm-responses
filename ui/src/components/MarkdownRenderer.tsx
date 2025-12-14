import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useAnimatedText } from '../hooks/useAnimatedText'

interface MarkdownRendererProps {
  content: string
  animateText?: boolean
}

function MarkdownRendererInner({ content, animateText = false }: MarkdownRendererProps) {
  const animatedContent = animateText ? useAnimatedText(content, true) : content

  return (
    <ReactMarkdown
      components={{
        code({ node, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline = !match && !className

          return isInline ? (
            <code className="inline-code" {...props}>
              {children}
            </code>
          ) : (
            <SyntaxHighlighter
              style={vscDarkPlus}
              language={match ? match[1] : 'text'}
              PreTag="div"
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          )
        },
      }}
    >
      {animatedContent}
    </ReactMarkdown>
  )
}

export const MarkdownRenderer = memo(MarkdownRendererInner)
