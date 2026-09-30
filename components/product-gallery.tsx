'use client'

import { useState } from 'react'
import { PLACEHOLDER_IMAGE, productImageSrc, type CatalogProduct } from '@/lib/catalog'
import { productImageAlt } from '@/lib/seo'

export function ProductGallery({ product }: { product: CatalogProduct }) {
  const images = product.images.length ? product.images : [productImageSrc(product)]
  const [active, setActive] = useState(0)
  const current = images[Math.min(active, images.length - 1)]
  const isInstallation = Boolean(product.imageAssets.find((asset) => asset.secureUrl === current)?.installation)
  const hasThumbs = images.length > 1

  function fallback(event: React.SyntheticEvent<HTMLImageElement>) {
    if (!event.currentTarget.src.endsWith(PLACEHOLDER_IMAGE)) {
      event.currentTarget.src = PLACEHOLDER_IMAGE
    }
  }

  return (
    <div className={hasThumbs ? 'product-gallery has-thumbs' : 'product-gallery'}>
      {hasThumbs && (
        <div className="gallery-thumbs">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              className={index === active ? 'thumb active' : 'thumb'}
              onClick={() => setActive(index)}
              aria-label={productImageAlt(product, index)}
            >
              <img src={src} alt={productImageAlt(product, index)} onError={fallback} />
              {product.imageAssets.find((asset) => asset.secureUrl === src)?.installation ? (
                <span className="thumb-badge">Recent installation</span>
              ) : null}
            </button>
          ))}
        </div>
      )}
      <div className="product-image detail">
        <img src={current} alt={productImageAlt(product, active)} onError={fallback} />
        {isInstallation ? <span className="gallery-badge">Recent installation</span> : null}
      </div>
    </div>
  )
}
