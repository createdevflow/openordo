import { notFound } from "next/navigation"
import { LEGAL_PAGES } from "@/lib/legal-content"
import { Metadata } from "next"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const p = await params
  const page = LEGAL_PAGES[p.slug]
  if (!page) return {}
  return { title: page.title }
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const p = await params
  const page = LEGAL_PAGES[p.slug]
  
  if (!page) {
    notFound()
  }

  return (
    <div className="py-20 px-7 max-w-[800px] mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-serif font-bold text-ink mb-3">{page.title}</h1>
        <p className="text-ink-soft">Last updated: {page.lastUpdated}</p>
      </div>
      
      <div 
        className="prose prose-forest max-w-none text-ink
                   prose-headings:font-serif prose-headings:text-ink prose-headings:font-bold
                   prose-a:text-forest hover:prose-a:text-forest-soft
                   prose-p:leading-relaxed"
        dangerouslySetInnerHTML={{ 
          // Super simple markdown to HTML parser for basic headings and lists
          __html: page.content
            .replace(/^## (.*$)/gim, '<h2 class="text-2xl mt-8 mb-4">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-3xl mt-10 mb-5">$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc mb-1">$1</li>')
            .replace(/\n\n/g, '<br><br>')
        }}
      />
    </div>
  )
}
