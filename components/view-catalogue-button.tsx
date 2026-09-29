'use client'

import { FileText } from 'lucide-react'
import { slugifyName, type CatalogProduct } from '@/lib/catalog'

export function ViewCatalogueButton({
  product,
  href,
  compact = false,
}: {
  product: Pick<CatalogProduct, 'id' | 'slug' | 'name'>
  href?: string
  compact?: boolean
}) {
  if (!href && compact) return null

  const label = (
    <span className="catalogue-dance">
      <FileText size={compact ? 13 : 16} />
      View Catalogue
    </span>
  )

  if (!href) {
    return (
      <span className="view-catalogue-btn is-pending" title="Upload this machine’s PDF in Admin → Catalogues">
        {label}
      </span>
    )
  }

  return (
    <a
      className={compact ? 'view-catalogue-btn compact' : 'view-catalogue-btn'}
      href={href}
      download={`${slugifyName(product.name) || 'catalogue'}.pdf`}
    >
      {label}
    </a>
  )
}
