import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { OfferActions } from '@/components/offer-actions'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { formatKes, productHref } from '@/lib/catalog'
import { offerHref } from '@/lib/content'
import { isOfferLive, offerPriceForProduct } from '@/lib/offers'
import { pageMetadata } from '@/lib/seo'
import { seoKeywordsList } from '@/lib/seo-fields'
import { ROUTES } from '@/lib/routes'
import { getCatalog, getOfferBySlug } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getOfferBySlug(slug).catch(() => null)
  if (!item || !isOfferLive(item)) return { title: COMPANY.name, robots: { index: false, follow: true } }
  return pageMetadata({
    title: item.seo?.seoTitle || item.title,
    description: item.seo?.seoDescription || item.description || item.discountText || `Current offer from ${COMPANY.shortName}`,
    path: offerHref(item),
    image: item.banner?.secureUrl,
    keywords: seoKeywordsList(item.seo?.seoKeywords || item.seo?.focusKeyword || ''),
    absoluteTitle: Boolean(item.seo?.seoTitle),
  })
}

export default async function OfferPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [item, catalog] = await Promise.all([
    getOfferBySlug(slug).catch(() => null),
    getCatalog().catch(() => ({ products: [], categories: [] })),
  ])
  if (!item || !isOfferLive(item)) notFound()
  const linked = catalog.products.filter((product) => item.productIds.includes(product.id) || product.id === item.customProductId)
  const imageAlt = item.seo?.imageAlt || item.title

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <article className="shell section offer-detail">
        <Breadcrumbs
          items={[
            HOME_CRUMB,
            { name: 'Offers', path: ROUTES.offers },
            { name: item.title, path: offerHref(item) },
          ]}
        />
        {item.banner && <img className="offer-image" src={item.banner.secureUrl} alt={imageAlt} />}
        <span className="kicker">On offer</span>
        <h1 className="page-title">{item.title}</h1>
        <p className="hero-lede">{item.seo?.seoDescription || item.discountText || item.description}</p>
        {item.kind === 'custom' && item.showPrice !== false && item.price > 0 && <p className="offer-cash">{formatKes(item.price)}</p>}
        {item.description ? <p>{item.description}</p> : null}
        {linked.length > 0 && (
          <ul className="offer-products">
            {linked.map((product) => {
              const deal = offerPriceForProduct(item, product.id)
              const cash = deal.price || product.price
              return (
                <li key={product.id}>
                  <Link href={productHref(product)}>{product.name}</Link>
                  {deal.showPrice && cash > 0 ? (
                    <span>
                      {deal.compareAt > cash ? <s>{formatKes(deal.compareAt)}</s> : null}
                      {formatKes(cash)}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
        <OfferActions offer={item} products={linked} />
      </article>
      <SiteFooter />
    </main>
  )
}
