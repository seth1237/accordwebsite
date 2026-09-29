import { CategorySidebar } from '@/components/category-sidebar'
import { buildNavCategories } from '@/lib/catalog'
import { getCatalog } from '@/lib/site-data'

export async function ShopShell({
  children,
  activeSlug,
}: {
  children: React.ReactNode
  activeSlug?: string
}) {
  const catalog = await getCatalog()
  return (
    <div className="shop-shell">
      <CategorySidebar categories={buildNavCategories(catalog)} activeSlug={activeSlug} />
      <div className="shop-main">{children}</div>
    </div>
  )
}
