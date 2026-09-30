import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { JsonLd } from '@/components/json-ld'
import { articleJsonLd, breadcrumbJsonLd, pageMetadata } from '@/lib/seo'
import { getPostBySlug, newsPostHref } from '@/lib/news'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: COMPANY.name, robots: { index: false, follow: true } }
  return pageMetadata({
    title: post.title,
    description: post.summary,
    path: newsPostHref(post),
  })
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()
  const path = newsPostHref(post)

  return (
    <main className="min-h-screen">
      <JsonLd data={articleJsonLd({ title: post.title, description: post.summary, path, date: post.isoDate })} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'News', path: ROUTES.news },
          { name: post.title, path },
        ])}
      />
      <SiteHeader />
      <section className="shell section job-detail">
        <Link href={ROUTES.news} className="text-link">← All news</Link>
        <span className="kicker">{post.tag}</span>
        <h1 className="page-title">{post.title}</h1>
        <p className="hero-lede">{post.date}</p>
        <div className="job-copy">
          {post.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        {post.related && post.related.length > 0 && (
          <nav className="post-related" aria-label="Related pages">
            <h2>Related products and pages</h2>
            <ul>
              {post.related.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-link">{item.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
