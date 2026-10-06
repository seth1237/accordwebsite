import Link from 'next/link'
import { JsonLd } from '@/components/json-ld'
import { breadcrumbJsonLd, type BreadcrumbCrumb } from '@/lib/seo'

export type { BreadcrumbCrumb }

export const HOME_CRUMB: BreadcrumbCrumb = { name: 'Home', path: '/' }

export function Breadcrumbs({ items }: { items: BreadcrumbCrumb[] }) {
  if (items.length < 2) return null
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <ol>
          {items.map((crumb, index) => {
            const current = index === items.length - 1
            return (
              <li key={`${crumb.path}-${index}`}>
                {current ? (
                  <span aria-current="page">{crumb.name}</span>
                ) : (
                  <Link href={crumb.path}>{crumb.name}</Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
