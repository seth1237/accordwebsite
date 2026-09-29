import Link from 'next/link'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { newsPostHref, newsPosts } from '@/lib/news'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export default function NewsPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="shell section blog-page">
        <span className="kicker">From the field</span>
        <h1 className="page-title">Ideas worth <em>sharing.</em></h1>
        <p className="hero-lede">Clinical insights, company news, and practical perspectives from the {COMPANY.shortName} team.</p>
        <div className="post-grid">
          {newsPosts.map((post) => (
            <article className="post-card" key={post.slug}>
              <div className="post-meta">
                <span>{post.tag}</span>
                <span>{post.date}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.summary}</p>
              <Link href={newsPostHref(post)} className="text-link">Read more</Link>
            </article>
          ))}
        </div>
        <Link href={ROUTES.home} className="text-link">← Back to {COMPANY.shortName}</Link>
      </section>
      <SiteFooter />
    </main>
  )
}
