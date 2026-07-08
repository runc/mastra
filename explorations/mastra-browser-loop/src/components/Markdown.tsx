import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { HtmlCodeBlock } from './HtmlCodeBlock'

interface MarkdownProps {
  children: string
}

function extractCodeText(children: React.ReactNode): string {
  if (typeof children === 'string') return children
  if (Array.isArray(children)) {
    return children
      .map(c => (typeof c === 'string' ? c : ''))
      .join('')
  }
  return String(children ?? '')
}

const components = {
  code({ className, children, ...props }: any) {
    const isInline = !className
    if (isInline) {
      return (
        <code
          className="px-1 py-0.5 rounded bg-(--surface4) text-(--accent1) text-[0.85em] font-mono"
          {...props}
        >
          {children}
        </code>
      )
    }

    const codeText = extractCodeText(children).replace(/\n$/, '')
    const lang = className?.replace('language-', '')

    if (lang === 'html') {
      return <HtmlCodeBlock code={codeText} />
    }

    return (
      <pre className="my-2 rounded-lg border border-(--border1) bg-(--surface2) overflow-x-auto">
        <code className="block px-3 py-2 text-xs font-mono text-(--neutral5)" {...props}>
          {children}
        </code>
      </pre>
    )
  },
  a({ children, href, ...props }: any) {
    return (
      <a
        className="text-(--accent1) underline hover:opacity-80"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    )
  },
  ul({ children, ...props }: any) {
    return (
      <ul className="my-1.5 pl-5 list-disc" {...props}>
        {children}
      </ul>
    )
  },
  ol({ children, ...props }: any) {
    return (
      <ol className="my-1.5 pl-5 list-decimal" {...props}>
        {children}
      </ol>
    )
  },
  li({ children, ...props }: any) {
    return (
      <li className="my-0.5" {...props}>
        {children}
      </li>
    )
  },
  p({ children, ...props }: any) {
    return (
      <p className="my-1 first:mt-0 last:mb-0" {...props}>
        {children}
      </p>
    )
  },
  strong({ children, ...props }: any) {
    return (
      <strong className="font-semibold text-(--neutral6)" {...props}>
        {children}
      </strong>
    )
  },
  blockquote({ children, ...props }: any) {
    return (
      <blockquote
        className="my-2 pl-3 border-l-2 border-(--accent1)/40 text-(--neutral3) italic"
        {...props}
      >
        {children}
      </blockquote>
    )
  },
  h1({ children, ...props }: any) {
    return (
      <h1 className="mt-3 mb-1 text-lg font-semibold text-(--neutral6)" {...props}>
        {children}
      </h1>
    )
  },
  h2({ children, ...props }: any) {
    return (
      <h2 className="mt-2.5 mb-1 text-base font-semibold text-(--neutral6)" {...props}>
        {children}
      </h2>
    )
  },
  h3({ children, ...props }: any) {
    return (
      <h3 className="mt-2 mb-1 text-sm font-semibold text-(--neutral6)" {...props}>
        {children}
      </h3>
    )
  },
  hr(props: any) {
    return <hr className="my-3 border-(--border1)" {...props} />
  },
  table({ children, ...props }: any) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="min-w-full text-sm border-collapse" {...props}>
          {children}
        </table>
      </div>
    )
  },
  th({ children, ...props }: any) {
    return (
      <th className="px-2 py-1 border border-(--border1) bg-(--surface3) font-semibold text-left" {...props}>
        {children}
      </th>
    )
  },
  td({ children, ...props }: any) {
    return (
      <td className="px-2 py-1 border border-(--border1)" {...props}>
        {children}
      </td>
    )
  },
}

export const Markdown = memo(function Markdown({ children }: MarkdownProps) {
  if (!children?.trim()) return null
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
})
