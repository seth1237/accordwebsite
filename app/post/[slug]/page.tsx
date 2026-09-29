import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { getPostBySlug } from '@/lib/news'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) return { title: COMPANY.name }
  return {
    title: `${post.title} | ${COMPANY.shortName} news`,
    description: post.summary,
  }
}

export default async function NewsPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getPostBySlug(slug)
  if (!post) notFound()

  return (
    <main className="min-h-screen">
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
      </section>
      <SiteFooter />
    </main>
  )
}
