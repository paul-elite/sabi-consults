
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Linkedin01Icon, NewTwitterIcon, News01Icon, WhatsappIcon } from '@hugeicons/core-free-icons'
import { cleanHtml } from '@/lib/sanitize'
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
      title: 'Blog Not Found',
    }
  }

  return {
    title: `${blog.title}`,
    description: blog.excerpt || `Read ${blog.title} on our blog.`,
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
    <div className="min-h-screen pt-16 lg:pt-20">
      {/* Hero */}
      <section className="bg-brand py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors mb-8"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            Back to Blog
          </Link>

          <div className="flex items-center gap-3 text-sm text-neutral-400 mb-4">
            <span>{blog.author}</span>
            <span>•</span>
            <time dateTime={blog.publishedAt}>
              {blog.publishedAt ? formatDate(blog.publishedAt) : 'Draft'}
            </time>
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white leading-tight">
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
        <div className="rounded-xl overflow-hidden relative w-full aspect-[21/9] bg-neutral-100">
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
              prose-headings:font-heading prose-headings:font-normal prose-headings:text-ink
              prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
              prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
              prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2
              prose-p:text-neutral-600 prose-p:leading-relaxed
              prose-a:text-brand prose-a:no-underline hover:prose-a:underline
              prose-strong:text-ink
              prose-ul:text-neutral-600 prose-ol:text-neutral-600
              prose-li:my-1
              prose-img:rounded-lg"
            dangerouslySetInnerHTML={{ __html: cleanHtml(blog.content) }}
          />

          {/* Share */}
          <div className="border-t border-neutral-200 mt-12 pt-8">
            <p className="text-sm font-medium text-neutral-500 mb-4">Share this article</p>
            <div className="flex gap-4">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(blog.title)}&url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://sabiconsults.com.ng'}/blog/${blog.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <HugeiconsIcon icon={NewTwitterIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://sabiconsults.com.ng'}/blog/${blog.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <HugeiconsIcon icon={Linkedin01Icon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${blog.title} - ${process.env.NEXT_PUBLIC_SITE_URL || 'https://sabiconsults.com.ng'}/blog/${blog.slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg p-2 bg-neutral-100 hover:bg-neutral-200 transition-colors"
              >
                <HugeiconsIcon icon={WhatsappIcon} className="w-5 h-5" strokeWidth={1.7} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </article>

      {/* Related Posts */}
      {relatedBlogs.length > 0 && (
        <section className="py-12 md:py-16 bg-brand-soft">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <h2 className="text-2xl font-semibold text-ink mb-8">More Articles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {relatedBlogs.map((relatedBlog) => (
                <Link key={relatedBlog.id} href={`/blog/${relatedBlog.slug}`} className="group">
                  <div className="rounded-xl overflow-hidden relative aspect-[3/2] overflow-hidden bg-neutral-100">
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
                        <HugeiconsIcon icon={News01Icon} className="w-12 h-12 text-neutral-300" strokeWidth={1.7} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-neutral-500 mb-2">
                      {relatedBlog.publishedAt ? formatDate(relatedBlog.publishedAt) : 'Draft'}
                    </p>
                    <h3 className="text-xl font-semibold text-ink group-hover:text-brand transition-colors">
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
      <section className="py-16 bg-brand">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-4">
            Ready to Invest in Abuja Real Estate?
          </h2>
          <p className="text-white/80 mb-8">
            Let our experts guide you to the perfect property investment.
          </p>
          <Link
            href="/contact"
            className="rounded-lg inline-flex px-8 py-4 bg-white text-brand text-sm font-medium uppercase tracking-wider hover:bg-white/90 transition-colors"
          >
            Contact Us Today
          </Link>
        </div>
      </section>
    </div>
  )
}
