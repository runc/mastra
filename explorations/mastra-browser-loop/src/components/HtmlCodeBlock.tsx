import { useState, useCallback, useRef, useEffect } from 'react'

interface HtmlCodeBlockProps {
  code: string
}

const MIN_PREVIEW_HEIGHT = 100
const DEFAULT_PREVIEW_HEIGHT = 300
const MAX_RENDER_HEIGHT = 800

export function HtmlCodeBlock({ code }: HtmlCodeBlockProps) {
  const [mode, setMode] = useState<'source' | 'preview'>('source')
  const [iframeKey, setIframeKey] = useState(0)
  const [copied, setCopied] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [iframeHeight, setIframeHeight] = useState(DEFAULT_PREVIEW_HEIGHT)

  // Refresh preview
  const handleRefresh = useCallback(() => {
    setIframeKey(k => k + 1)
  }, [])

  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'mastra-html-snippet.html'
    link.click()
    URL.revokeObjectURL(url)
  }, [code])

  const handleCopy = useCallback(async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code)
    } else {
      const textarea = document.createElement('textarea')

      textarea.value = code
      textarea.style.position = 'fixed'
      textarea.style.left = '-9999px'
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }, [code])

  // Listen for iframe resize messages
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'resize' && typeof e.data.height === 'number') {
        setIframeHeight(Math.max(MIN_PREVIEW_HEIGHT, Math.min(e.data.height, MAX_RENDER_HEIGHT)))
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // Inject a resize observer script into the iframe content
  const wrapHtml = (html: string) => {
    const script = `<script>(function(){var r=new ResizeObserver(function(e){var h=e[0]?.contentRect?.height;if(h)parent.postMessage({type:'resize',height:h+20},'*')});r.observe(document.documentElement);r.observe(document.body)})()</script>`
    // Insert the script before </body> or at the end
    if (html.includes('</body>')) {
      return html.replace('</body>', `${script}</body>`)
    }
    return html + script
  }

  const tabs = [
    { key: 'source' as const, label: 'Source' },
    { key: 'preview' as const, label: 'Preview' },
  ]

  return (
    <div className="my-2 rounded-lg border border-(--border1) bg-(--surface2) overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-(--border1) bg-(--surface3) px-1">
        <div className="flex items-center">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
                mode === tab.key
                  ? 'border-(--accent1) text-(--accent1)'
                  : 'border-transparent text-(--neutral2) hover:text-(--neutral4)'
              }`}
              onClick={() => setMode(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="ml-auto mr-2 text-[10px] text-(--neutral2) uppercase tracking-wide">HTML</span>
        <button
          className="mr-1 px-2 py-0.5 text-[10px] text-(--neutral2) hover:text-(--neutral4) transition-colors cursor-pointer"
          onClick={handleCopy}
          title="Copy HTML"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          className="mr-1 px-2 py-0.5 text-[10px] text-(--neutral2) hover:text-(--neutral4) transition-colors cursor-pointer"
          onClick={handleDownload}
          title="Download HTML"
        >
          Download
        </button>
        {mode === 'preview' && (
          <button
            className="mr-1 px-2 py-0.5 text-[10px] text-(--neutral2) hover:text-(--neutral4) transition-colors cursor-pointer"
            onClick={handleRefresh}
            title="Refresh preview"
          >
            ↻
          </button>
        )}
      </div>

      {/* Content */}
      <div ref={containerRef}>
        {mode === 'source' ? (
          <pre style={{ maxHeight: MAX_RENDER_HEIGHT }} className="overflow-auto m-0">
            <code className="block px-3 py-2 text-xs font-mono text-(--neutral5) whitespace-pre">
              {code}
            </code>
          </pre>
        ) : (
          <div style={{ height: iframeHeight, maxHeight: MAX_RENDER_HEIGHT }} className="relative overflow-hidden">
            <iframe
              key={iframeKey}
              className="w-full h-full border-0"
              sandbox="allow-scripts"
              srcDoc={wrapHtml(code)}
              title="HTML Preview"
            />
          </div>
        )}
      </div>
    </div>
  )
}
