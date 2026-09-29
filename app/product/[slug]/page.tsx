import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { QuoteForm } from '@/components/quote-form'
import { ProductGallery } from '@/components/product-gallery'
import { TrackProductClick } from '@/components/track-product-click'
import { RelatedProducts } from '@/components/related-products'
import { displayPrice, productHref } from '@/lib/catalog'
import { catalogueDownloadHref } from '@/lib/content'
import { getCatalogProduct, getPriceVisibility, getRelatedProducts, listCatalogues } from '@/lib/site-data'
import { COMPANY } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const product = await getCatalogProduct(slug)
  if (!product) return { title: COMPANY.name }
  const image = product.image || COMPANY.logo
  return {
    title: `${product.name} | ${COMPANY.shortName}`,
    description: product.description || `${product.name} from ${COMPANY.name}`,
    alternates: { canonical: `${COMPANY.url}${productHref(product)}` },
    openGraph: {
      title: product.name,
      description: product.description || `${product.name} from ${COMPANY.name}`,
      url: `${COMPANY.url}${productHref(product)}`,
      images: [{ url: image.startsWith('http') ? image : COMPANY.logo, alt: product.name }],
    },
  }
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
  const priceLabel = displayPrice(product, showPrices)

  return (
    <main className="min-h-screen">
      <TrackProductClick
        productId={product.id}
        productName={product.name}
        categoryId={product.categoryId}
        categoryName={product.categoryName}
      />
      <SiteHeader />
      <section className="section product-page">
        <div className="shell">
          <nav className="product-breadcrumb" aria-label="Breadcrumb">
            <Link href="/products">Products</Link>
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
                <p className={priceLabel === 'Request a quote' ? 'detail-price quote-note' : 'detail-price'}>
                  {priceLabel === 'Request a quote' ? 'Available on request' : priceLabel}
                </p>
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
                      <div dangerouslySetInnerHTML={{ __html: product.details }} />
                    </div>
                  </div>
                ) : product.description ? (
                  <div className="product-tabs" id="details">
                    <div className="product-tablist" role="tablist">
                      <span className="active">Details</span>
                    </div>
                    <div className="product-specs">
                      <p>{product.description}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>
      {related.length > 0 && <RelatedProducts products={related} showPrices={showPrices} catalogues={catalogues} />}
      <SiteFooter />
    </main>
  )
}
