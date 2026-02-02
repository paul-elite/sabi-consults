import Link from 'next/link'
import Image from 'next/image'
import { getAllBlogs } from '@/lib/blogs'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Blog | Sabi Consults',
  description: 'Expert insights on Abuja real estate, investment tips, market trends, and guides for property buyers in Nigeria.',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function BlogPage() {
  const blogs = await getAllBlogs()

  return (
    <div className="min-h-screen pt-20">
      {/* Hero */}
      <section className="bg-[#1a1a1a] py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-[#0055CC] uppercase tracking-wider mb-4">
              Insights & Updates
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light text-white mb-6">
              Sabi Consults Blog
            </h1>
            <p className="text-lg text-neutral-400">
              Expert insights on Abuja real estate, investment guides, market trends,
              and tips for making informed property decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {blogs.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-neutral-500">No blog posts yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog, index) => (
                <article
                  key={blog.id}
                  className={`group ${index === 0 ? 'md:col-span-2 lg:col-span-2' : ''}`}
                >
                  <Link href={`/blog/${blog.slug}`}>
                    {/* Image */}
                    <div className={`relative overflow-hidden bg-neutral-100 ${index === 0 ? 'aspect-[2/1]' : 'aspect-[3/2]'}`}>
                      {blog.coverImage ? (
                        <Image
                          src={blog.coverImage}
                          alt={blog.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes={index === 0 ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 100vw, 33vw'}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9.5a2 2 0 00-2-2h-2" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="mt-4">
                      <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
                        <span>{blog.author}</span>
                        <span>•</span>
                        <time dateTime={blog.publishedAt}>
                          {blog.publishedAt ? formatDate(blog.publishedAt) : 'Draft'}
                        </time>
                      </div>

                      <h2 className={`font-medium text-[#1a1a1a] group-hover:text-[#0055CC] transition-colors ${index === 0 ? 'text-2xl md:text-3xl' : 'text-xl'}`}>
                        {blog.title}
                      </h2>

                      {blog.excerpt && (
                        <p className={`text-neutral-600 mt-2 line-clamp-2 ${index === 0 ? 'text-base' : 'text-sm'}`}>
                          {blog.excerpt}
                        </p>
                      )}

                      <span className="inline-flex items-center gap-1 text-sm font-medium text-[#0055CC] mt-4">
                        Read More
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#f8f6f3]">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-light text-[#1a1a1a] mb-4">
            Have Questions About Abuja Real Estate?
          </h2>
          <p className="text-neutral-600 mb-8">
            Our team is ready to provide expert guidance tailored to your needs.
          </p>
          <Link
            href="/contact"
            className="inline-flex px-8 py-4 bg-[#0055CC] text-white text-sm font-medium uppercase tracking-wider hover:bg-[#0044aa] transition-colors"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  )
}
