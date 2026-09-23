import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import Link from "next/link"
import type { Components } from "react-markdown"

interface LegalMarkdownProps {
  /** Markdown source (already with tokens replaced). */
  source: string
}

/**
 * Renders legal markdown with:
 *  - GitHub-flavoured tables (wrapped in overflow container)
 *  - Heading anchors (rehype-slug)
 *  - Internal links via next/link, external links with rel="noopener noreferrer"
 *  - Styled inline code
 *  - Horizontal rules
 */
export function LegalMarkdown({ source }: LegalMarkdownProps) {
  const components: Components = {
    // ── Headings ─────────────────────────────────────────────────────────────
    // The H1 is rendered by the page shell (not twice here).
    // We skip the first H1 encountered so content starts at H2.
    h1: ({ children }) => (
      // render first H1 as nothing — the page already shows it as the title
      <>{/* H1 suppressed — rendered as page title */}</>
    ),
    h2: ({ node, children, ...props }) => (
      <h2 className="legal-h2" {...props}>
        {children}
      </h2>
    ),
    h3: ({ node, children, ...props }) => (
      <h3 className="legal-h3" {...props}>
        {children}
      </h3>
    ),
    h4: ({ node, children, ...props }) => (
      <h4 className="legal-h4" {...props}>
        {children}
      </h4>
    ),

    // ── Paragraphs ────────────────────────────────────────────────────────────
    p: ({ children }) => <p className="legal-p">{children}</p>,

    // ── Links ─────────────────────────────────────────────────────────────────
    a: ({ href, children }) => {
      if (!href) return <>{children}</>
      const isInternal = href.startsWith("/") || href.startsWith("#")
      if (isInternal) {
        return (
          <Link href={href} className="legal-link">
            {children}
          </Link>
        )
      }
      return (
        <a
          href={href}
          className="legal-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      )
    },

    // ── Tables ────────────────────────────────────────────────────────────────
    table: ({ children }) => (
      <div className="legal-table-wrap">
        <table className="legal-table">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="legal-thead">{children}</thead>,
    th: ({ children }) => <th className="legal-th">{children}</th>,
    td: ({ children }) => <td className="legal-td">{children}</td>,
    tr: ({ children }) => <tr className="legal-tr">{children}</tr>,

    // ── Lists ─────────────────────────────────────────────────────────────────
    ul: ({ children }) => <ul className="legal-ul">{children}</ul>,
    ol: ({ children }) => <ol className="legal-ol">{children}</ol>,
    li: ({ children }) => <li className="legal-li">{children}</li>,

    // ── Inline code ───────────────────────────────────────────────────────────
    code: ({ inline, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="legal-code-inline" {...props}>
            {children}
          </code>
        )
      }
      return (
        <pre className="legal-pre">
          <code className="legal-code-block" {...props}>
            {children}
          </code>
        </pre>
      )
    },

    // ── HR ────────────────────────────────────────────────────────────────────
    hr: () => <hr className="legal-hr" />,

    // ── Blockquote ────────────────────────────────────────────────────────────
    blockquote: ({ children }) => (
      <blockquote className="legal-blockquote">{children}</blockquote>
    ),

    // ── Strong / Em ───────────────────────────────────────────────────────────
    strong: ({ children }) => (
      <strong className="legal-strong">{children}</strong>
    ),
  }

  return (
    <div className="legal-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={components}
        // Allow the span tags we insert for unresolved tokens in dev
        rehypeOptions={{ allowDangerousHtml: true }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
