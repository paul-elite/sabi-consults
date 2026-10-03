// Cleans HTML written in the blog editor so it can't carry scripts,
// event handlers or hidden iframes. Used on save and again on display.
import sanitizeHtml from 'sanitize-html'

export function cleanHtml(dirty: string): string {
  return sanitizeHtml(dirty || '', {
    allowedTags: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'span', 'div',
      'figure', 'figcaption', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      '*': ['class'],
    },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https', 'http', 'data'] },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer nofollow' }, true),
    },
  })
}

/** Plain text with HTML removed, for names, messages and other short fields. */
export function cleanText(value: unknown, max = 2000): string {
  return sanitizeHtml(String(value ?? ''), { allowedTags: [], allowedAttributes: {} }).trim().slice(0, max)
}
