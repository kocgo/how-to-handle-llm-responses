import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MarkdownRendererProps {
  content: string
}

function MarkdownRendererInner({ content }: MarkdownRendererProps) {
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
      {content}
    </ReactMarkdown>
  )
}

export const MarkdownRenderer = memo(MarkdownRendererInner)
