import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface CodeBlockProps {
  code: string
  language?: string
  title?: string
  highlightLines?: number[]
}

export function CodeBlock({
  code,
  language = 'tsx',
  title,
  highlightLines = [],
}: CodeBlockProps) {
  return (
    <div className="code-block">
      {title && <div className="code-block-title">{title}</div>}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        showLineNumbers
        wrapLines
        lineProps={(lineNumber) => {
          const style: React.CSSProperties = { display: 'block' }
          if (highlightLines.includes(lineNumber)) {
            style.backgroundColor = 'rgba(255, 255, 0, 0.15)'
            style.borderLeft = '3px solid #fbbf24'
            style.marginLeft = '-3px'
          }
          return { style }
        }}
        customStyle={{
          margin: 0,
          borderRadius: title ? '0 0 8px 8px' : '8px',
          fontSize: '14px',
        }}
      >
        {code.trim()}
      </SyntaxHighlighter>
    </div>
  )
}
