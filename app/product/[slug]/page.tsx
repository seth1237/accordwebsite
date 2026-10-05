import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { QuoteForm } from '@/components/quote-form'
import { ProductGallery } from '@/components/product-gallery'
import { TrackProductClick } from '@/components/track-product-click'
import { RelatedProducts } from '@/components/related-products'
import { JsonLd } from '@/components/json-ld'
import { categoryHref, displayPrice, productHref } from '@/lib/catalog'
import { catalogueDownloadHref } from '@/lib/content'
import { breadcrumbJsonLd, pageMetadata, productJsonLd, productMetaDescription } from '@/lib/seo'
import { seoKeywordsList } from '@/lib/seo-fields'
import { getCatalogProduct, getPriceVisibility, getRelatedProducts, listCatalogues } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getCatalogProduct(slug)
  if (!product) return { title: COMPANY.name, robots: { index: false, follow: true } }
  const image = product.image || COMPANY.logo
  const description = productMetaDescription(product)
  return pageMetadata({
    title: product.seo?.seoTitle || product.name,
    description,
    path: productHref(product),
    image,
    keywords: seoKeywordsList(product.seo?.seoKeywords || product.seo?.focusKeyword || ''),
    absoluteTitle: Boolean(product.seo?.seoTitle),
  })
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const product = await getCatalogProduct(slug)
  if (!product) notFound()
  if (product.slug && product.slug !== decodeURIComponent(slug)) {
    redirect(productHref(product))
  }
  const [showPrices, related, catalogues] = await Promise.all([
    getPriceVisibility(),
    getRelatedProducts(product, 10),
    listCatalogues().catch(() => []),
  ])
  const catalogueHref = catalogueDownloadHref(product, catalogues)
  const revealPrice = showPrices && (!product.onOffer || product.offerShowPrice !== false)
  const priceLabel = displayPrice(product, revealPrice)
  const categoryPath = categoryHref({ slug: product.categoryId, name: product.categoryName })

  return (
    <main className="min-h-screen">
      <JsonLd data={productJsonLd(product, revealPrice)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: 'Products', path: '/products' },
          { name: product.categoryName, path: categoryPath },
          { name: product.name, path: productHref(product) },
        ])}
      />
      <TrackProductClick
        productId={product.id}
        productName={product.name}
        categoryId={product.categoryId}
        categoryName={product.categoryName}
        offerId={product.offerId}
      />
      <SiteHeader />
      <section className="section product-page">
        <div className="shell">
          <nav className="product-breadcrumb" aria-label="Breadcrumb">
            <Link href="/products">Products</Link>
            <span>/</span>
            <Link href={categoryPath}>{product.categoryName}</Link>
            <span>/</span>
            <span>{product.name}</span>
          </nav>
          <div className="product-stage">
            <div className="product-detail-grid">
              <ProductGallery product={product} />
              <div className="product-summary">
                <h1 className="product-detail-title">{product.name}</h1>
                <div className="product-meta-row">
                  {product.productType && <span className="product-chip">{product.productType}</span>}
                  {product.manufacturer && <span className="product-brand">Brand: {product.manufacturer}</span>}
                </div>
                {product.distributedFor && <p className="product-distributed">Distributed for: {product.distributedFor}</p>}
                {product.onOffer && (
                  <p className="offer-flag">
                    {product.offerSlug ? <Link href={`/offers/${product.offerSlug}`}>{product.offerLabel || 'On offer'}</Link> : (product.offerLabel || 'On offer')}
                  </p>
                )}
                <p className={priceLabel === 'Request a quote' ? 'detail-price quote-note' : 'detail-price'}>
                  {priceLabel === 'Request a quote' ? 'Available on request' : priceLabel}
                </p>
                {revealPrice && product.onOffer && product.compareAt && product.compareAt > product.price ? (
                  <p className="offer-was">Was {displayPrice({ price: product.compareAt }, true)}</p>
                ) : null}
                <QuoteForm product={product} catalogueHref={catalogueHref} />
                <dl className="product-sku-row">
                  <div>
                    <dt>SKU</dt>
                    <dd>{product.id}</dd>
                  </div>
                </dl>
                {product.details ? (
                  <div className="product-tabs" id="details">
                    <div className="product-tablist" role="tablist">
                      <span className="active">Details</span>
                    </div>
                    <div className="product-specs">
                      <h2 className="sr-only">Product details</h2>
                      <div dangerouslySetInnerHTML={{ __html: product.details }} />
                    </div>
                  </div>
                ) : product.description ? (
                  <div className="product-tabs" id="details">
                    <div className="product-tablist" role="tablist">
                      <span className="active">Details</span>
                    </div>
                    <div className="product-specs">
                      <h2 className="sr-only">Product details</h2>
                      <p>{product.description}</p>
                    </div>
                  </div>
                ) : (
                  <div className="product-tabs" id="details">
                    <h2 className="sr-only">About this equipment</h2>
                    <p>
                      {product.name}
                      {product.categoryName ? ` is listed under ${product.categoryName}` : ''} at {COMPANY.name}.
                      Request a quote for pricing, installation and availability in Kenya.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && (
        <RelatedProducts
          products={related}
          showPrices={showPrices}
          catalogues={catalogues}
          title={`More ${product.categoryName || 'equipment'}`}
        />
      )}
      <SiteFooter />
    </main>
  )
}
