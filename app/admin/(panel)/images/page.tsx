import { AdminProductsPanel } from '@/components/admin-products-panel'
import { getCatalog } from '@/lib/catalog-data'

export default async function AdminImagesPage() {
  const catalog = await getCatalog()
  const needingImages = catalog.products.filter((product) => product.imageAssets.length === 0)
  return (
    <AdminProductsPanel
      products={needingImages}
      categories={catalog.categories}
      title="Images"
      subtitle="Products still missing Cloudinary photos. Filter by category, then open one to upload."
    />
  )
}
