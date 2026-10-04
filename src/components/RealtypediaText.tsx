import Link from 'next/link'
import { entryBySlug } from '@/data/realtypedia'

/** Renders entry text, turning [[slug]] and [[slug|label]] into links to other entries. */
export default function RealtypediaText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/)
        if (!m) return part
        const entry = entryBySlug.get(m[1])
        const label = m[2] || entry?.term || m[1]
        if (!entry) return label
        return (
          <Link
            key={i}
            href={`/realtypedia/${entry.slug}`}
            title={entry.summary}
            className="text-brand underline decoration-brand/30 underline-offset-2 hover:decoration-brand transition-colors"
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

