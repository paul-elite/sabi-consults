import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getBlogBySlug, getRecentBlogs } from '@/lib/blogs'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) {
    return {
      title: 'Blog Not Found | Sabi Consults',
    }
  }

  return {
    title: `${blog.title} | Sabi Consults Blog`,
    description: blog.excerpt || `Read ${blog.title} on the Sabi Consults blog.`,
    openGraph: {
      title: blog.title,
      description: blog.excerpt,
      images: blog.coverImage ? [blog.coverImage] : [],
    },
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const blog = await getBlogBySlug(slug)

  if (!blog) {
    notFound()
  }

  const recentBlogs = await getRecentBlogs(3)
  const relatedBlogs = recentBlogs.filter(b => b.id !== blog.id).slice(0, 2)

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="bg-[#1a1a1a] py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-8"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Blog
          </Link>

          <div className="flex items-center gap-3 text-sm text-neutral-400 mb-4">
            <span>{blog.author}</span>
            <span>•</span>
            <time dateTime={blog.publishedAt}>
              {blog.publishedAt ? formatDate(blog.publishedAt) : 'Draft'}
            </time>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white leading-tight">
            {blog.title}
          </h1>

          {blog.excerpt && (
            <p className="text-lg text-neutral-400 mt-6">
              {blog.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* Cover Image */}
      {blog.coverImage && (
        <div className="relative w-full aspect-[21/9] bg-neutral-100">
          <Image
            src={blog.coverImage}
            alt={blog.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        </div>
      )}

      {/* Content */}
      <article className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-6 lg:px-8">
          <div
            className="prose prose-lg prose-neutral max-w-none
              prose-headings:font-heading prose-headings:font-normal prose-headings:text-[#1a1a1a]
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
              prose-p:text-neutral-600 prose-p:leading-relaxed
              prose-a:text-[#0055CC] prose-a:no-underline hover:prose-a:underline
              prose-strong:text-[#1a1a1a]
              prose-ul:text-neutral-600 prose-ol:text-neutral-600
              prose-li:my-1
              prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          {/* Share */}
          <div className="border-t border-neutral-200 mt-12 pt-8">
            <p className="text-sm font-medium text-neutral-500 mb-4">Share this article</p>
            <div className="flex gap-4">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`https://sabiconsults.com/blog/${blog.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://sabiconsults.com/blog/${blog.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${blog.title} - https://sabiconsults.com/blog/${blog.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedBlogs.length > 0 && (
        <section className="py-12 md:py-16 bg-[#f8f6f3]">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-light text-[#1a1a1a] mb-8">More Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedBlogs.map((relatedBlog) => (
                <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`} className="group">
                  <div className="relative aspect-[3/2] overflow-hidden bg-neutral-100">
                    {relatedBlog.coverImage ? (
                      <Image
                        src={relatedBlog.coverImage}
                        alt={relatedBlog.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-12 h-12 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-neutral-500 mb-2">
                      {relatedBlog.publishedAt ? formatDate(relatedBlog.publishedAt) : 'Draft'}
                    </p>
                    <h3 className="text-xl font-medium text-[#1a1a1a] group-hover:text-[#0055CC] transition-colors">
                      {relatedBlog.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-[#0055CC]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
            Ready to Invest in Abuja Real Estate?
          </h2>
          <p className="text-white/80 mb-8">
            Let our experts guide you to the perfect property investment.
          </p>
          <Link
            href="/contact"
            className="inline-flex px-8 py-4 bg-white text-[#0055CC] text-sm font-medium uppercase tracking-wider hover:bg-white/90 transition-colors"
          >
            Contact Us Today
          </Link>
        </div>
      </section>
    </div>
  )
}
