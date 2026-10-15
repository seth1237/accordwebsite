import { OfferHeader } from '@/components/offer-header'
import { SiteHeaderNav } from '@/components/site-header-nav'
import { getCustomerSession } from '@/lib/auth'
import { getCatalog, getSiteBootstrap, siteJobCount } from '@/lib/site-data'
import { buildNavCategories } from '@/lib/catalog'
import { productsForHeaderOffers } from '@/lib/offers'

export async function SiteHeader() {
  const [catalog, jobCount, bootstrap, account] = await Promise.all([
    getCatalog(),
    siteJobCount().catch(() => 0),
    getSiteBootstrap().catch(() => null),
    getCustomerSession().catch(() => null),
  ])
  const header = productsForHeaderOffers(catalog.products, bootstrap?.headerOffers || [])
  const products = catalog.products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryName: product.categoryName,
    manufacturer: product.manufacturer,
    productType: product.productType,
  }))
  return (
    <SiteHeaderNav
      categories={buildNavCategories(catalog, 5).filter((category) => category.slug !== 'uncategorized')}
      products={products}
      jobCount={jobCount}
      accountName={account?.name || ''}
      offerHeader={header.offer ? (
        <OfferHeader
          title={header.offer.title}
          discountText={header.offer.discountText}
          tagline={header.offer.headerTagline}
          ctaLabel={header.offer.headerCta}
          endsAt={header.offer.endDate}
          products={header.products}
          showPrices={bootstrap?.showPrices !== false}
        />
      ) : null}
    />
  )
}
