import { BarChart3, ImagePlus, MousePointerClick, Package, Share2 } from 'lucide-react'
import { productImageSrc } from '@/lib/catalog'
import { getCatalog } from '@/lib/catalog-data'
import { getCategoryPerformance } from '@/lib/mongodb'

export default async function AdminOverviewPage() {
  const catalog = await getCatalog()
  const categoryPerformance = await getCategoryPerformance().catch(() => [])
  const withImages = catalog.products.filter((product) => product.imageAssets.length > 0 || product.images.length > 0).length
  const totalClicks = catalog.products.reduce((sum, product) => sum + (product.clicks || 0), 0)
  const totalShares = catalog.products.reduce((sum, product) => sum + (product.shares || 0), 0)
  const byId = new Map(categoryPerformance.map((item) => [item.categoryId, item]))
  const categoryStats = catalog.categories
    .map((category) => ({
      id: category._id,
      name: category.name,
      productCount: category.count,
      clicks: byId.get(category._id)?.clicks || 0,
      shares: byId.get(category._id)?.shares || 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6)
  const maxClicks = Math.max(1, ...categoryStats.map((row) => row.clicks))
  const topProducts = catalog.products.slice(0, 5)

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Tarumed content manager</span>
          <h1>Overview</h1>
        </div>
        <div className="admin-user"><span className="status-dot" /> ERP connected</div>
      </header>
      <div className="admin-stats">
        <div><Package /><span><b>{catalog.products.length}</b><small>ERP products</small></span></div>
        <div><ImagePlus /><span><b>{withImages}</b><small>With photos</small></span></div>
        <div><MousePointerClick /><span><b>{totalClicks}</b><small>Clicks</small></span></div>
        <div><Share2 /><span><b>{totalShares}</b><small>Shares</small></span></div>
      </div>
      <div className="admin-card category-metrics">
        <div className="card-title">
          <div>
            <h3>Top categories</h3>
            <span>Open Performance for the full breakdown.</span>
          </div>
          <BarChart3 size={18} />
        </div>
        <div className="category-perf-list">
          {categoryStats.map((row) => (
            <div key={row.id} className="category-perf">
              <div className="category-perf-head">
                <b>{row.name}</b>
                <strong>{row.clicks}</strong>
              </div>
              <div className="category-perf-bar" aria-hidden="true">
                <span style={{ width: `${Math.round((row.clicks / maxClicks) * 100)}%` }} />
              </div>
              <small>{row.shares} shares · {row.productCount} products</small>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Most opened products</h3>
            <span>Manage details and photos in Products.</span>
          </div>
        </div>
        <div className="admin-product-list">
          {topProducts.map((product) => (
            <article key={product.id} className="admin-product-block">
              <div className="admin-product">
                <img src={productImageSrc(product)} alt="" />
                <div>
                  <b>{product.name}</b>
                  <small>{product.categoryName}</small>
                </div>
                <span className="click-metric">
                  <b>{product.clicks || 0}</b>
                  <small>clicks</small>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
