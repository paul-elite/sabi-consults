
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowRight02Icon, News01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { getBrand } from '@/lib/brand'
import Image from 'next/image'
import { getAllBlogs } from '@/lib/blogs'
import { Blog } from '@/lib/types'
import Eyebrow from '@/components/Eyebrow'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Blog',
  description: 'Expert insights on Abuja real estate, investment tips, market trends, and guides for property buyers in Nigeria.',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function estimateReadTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

function BlogCard({ blog, featured = false }: { blog: Blog; featured?: boolean }) {
  const readTime = estimateReadTime(blog.content)

  return (
    <article className={`group ${featured ? 'md:col-span-2' : ''}`}>
      <Link href={`/blog/${blog.slug}`} className="block">
        {/* Image */}
        <div className={`relative overflow-hidden bg-neutral-100 rounded-lg ${featured ? 'aspect-[2/1]' : 'aspect-[4/3]'}`}>
          {blog.coverImage ? (
            <Image
              src={blog.coverImage}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes={featured ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/10 to-brand/5">
              <HugeiconsIcon icon={News01Icon} className="w-12 h-12 text-brand/30" strokeWidth={1.7} aria-hidden="true" />
            </div>
          )}
          {/* Read time badge */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-medium text-ink">
            {readTime} min read
          </div>
        </div>

        {/* Content */}
        <div className="mt-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-2">
            <time dateTime={blog.publishedAt}>
              {blog.publishedAt ? formatDate(blog.publishedAt) : 'Draft'}
            </time>
          </div>

          <h2 className={`font-heading font-normal text-ink group-hover:text-brand transition-colors leading-snug ${featured ? 'text-xl md:text-2xl' : 'text-lg'}`}>
            {blog.title}
          </h2>

          {blog.excerpt && (
            <p className={`text-neutral-600 mt-2 line-clamp-2 ${featured ? 'text-base' : 'text-sm'}`}>
              {blog.excerpt}
            </p>
          )}
        </div>
      </Link>
    </article>
  )
}

export default async function BlogPage() {
  const brand = await getBrand()
  const blogs = await getAllBlogs()

  const featuredBlog = blogs[0]
  const remainingBlogs = blogs.slice(1)

  return (
    <div className="min-h-screen pt-16 lg:pt-20 bg-brand-soft">
      {/* Compact Hero */}
      <section className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="max-w-2xl">
            <h1 className="text-2xl md:text-3xl font-heading font-semibold text-ink">
              Abuja Property Insights
            </h1>
            <p className="text-neutral-600 mt-2">
              Market trends, buying guides, and local knowledge from {brand.name}
            </p>
          </div>
        </div>
      </section>

      {/* Blog Content */}
      <section className="py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {blogs.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center">
              <div className="w-16 h-16 bg-brand-soft rounded-full flex items-center justify-center mx-auto mb-4">
                <HugeiconsIcon icon={News01Icon} className="w-8 h-8 text-neutral-400" strokeWidth={1.7} aria-hidden="true" />
              </div>
              <h2 className="text-lg font-semibold text-ink mb-2">Coming Soon</h2>
              <p className="text-neutral-500 max-w-md mx-auto">
                We&apos;re preparing expert insights on Abuja real estate. Check back soon for guides, market updates, and investment tips.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Featured Post */}
              {featuredBlog && (
                <div className="bg-white rounded-xl p-4 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="relative aspect-[4/3] md:aspect-[3/2] overflow-hidden rounded-lg bg-neutral-100">
                      {featuredBlog.coverImage ? (
                        <Image
                          src={featuredBlog.coverImage}
                          alt={featuredBlog.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand/10 to-brand/5">
                          <HugeiconsIcon icon={News01Icon} className="w-16 h-16 text-brand/30" strokeWidth={1.7} aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="py-2">
                      <div className="flex items-center gap-3 mb-3">
                        <Eyebrow icon="featured" size="xs">Featured</Eyebrow>
                        <span className="text-xs text-neutral-400">
                          {featuredBlog.publishedAt ? formatDate(featuredBlog.publishedAt) : 'Draft'}
                        </span>
                      </div>
                      <h2 className="text-xl md:text-2xl font-heading font-semibold text-ink leading-snug mb-3">
                        <Link href={`/blog/${featuredBlog.slug}`} className="hover:text-brand transition-colors">
                          {featuredBlog.title}
                        </Link>
                      </h2>
                      {featuredBlog.excerpt && (
                        <p className="text-neutral-600 line-clamp-3 mb-4">
                          {featuredBlog.excerpt}
                        </p>
                      )}
                      <Link
                        href={`/blog/${featuredBlog.slug}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-brand hover:gap-3 transition-all"
                      >
                        Read Article
                        <HugeiconsIcon icon={ArrowRight02Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Grid of remaining posts */}
              {remainingBlogs.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {remainingBlogs.map((blog) => (
                    <div key={blog.id} className="bg-white rounded-xl p-4">
                      <BlogCard blog={blog} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter CTA */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand rounded-xl p-8 md:p-12 text-center">
            <h2 className="text-xl md:text-2xl font-heading font-semibold text-white mb-3">
              Questions About Abuja Property?
            </h2>
            <p className="text-neutral-400 mb-6 max-w-lg mx-auto">
              Our team provides expert guidance for buyers, investors, and diaspora Nigerians looking to own property in the capital.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-ink text-sm font-medium rounded-lg hover:bg-neutral-100 transition-colors"
            >
              Get in Touch
              <HugeiconsIcon icon={ArrowRight02Icon} className="w-4 h-4" strokeWidth={1.7} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
