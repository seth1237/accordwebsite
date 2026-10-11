import { BarChart3, Eye, MousePointerClick, Package, ShoppingCart } from 'lucide-react'
import { productImageSrc } from '@/lib/catalog'
import { getCategoryPerformance, getFullCatalog, getVisitorStats } from '@/lib/site-data'

export default async function AdminOverviewPage() {
  const [catalog, categoryPerformance, visitors] = await Promise.all([
    getFullCatalog(),
    getCategoryPerformance().catch(() => []),
    getVisitorStats().catch(() => ({ today: { date: '', visitors: 0, pageviews: 0, newVisitors: 0 }, days: [] })),
  ])
  const totalClicks = catalog.products.reduce((sum, product) => sum + (product.clicks || 0), 0)
  const totalCarts = catalog.products.reduce((sum, product) => sum + (product.carts || 0), 0)
  const byId = new Map(categoryPerformance.map((item) => [item.categoryId, item]))
  const categoryStats = catalog.categories
    .map((category) => ({
      id: category._id,
      name: category.name,
      productCount: category.count,
      clicks: byId.get(category._id)?.clicks || 0,
      shares: byId.get(category._id)?.shares || 0,
      carts: byId.get(category._id)?.carts || 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 6)
  const maxClicks = Math.max(1, ...categoryStats.map((row) => row.clicks))
  const topProducts = [...catalog.products]
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.carts || 0) - (a.carts || 0))
    .slice(0, 5)
  const topCarts = [...catalog.products]
    .filter((product) => product.carts)
    .sort((a, b) => (b.carts || 0) - (a.carts || 0))
    .slice(0, 5)

  return (
    <>
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Overview</h1>
        </div>
        <div className="admin-user"><span className="status-dot" /> ERP connected</div>
      </header>
      <div className="admin-stats">
        <div><Package /><span><b>{catalog.products.length}</b><small>ERP products</small></span></div>
        <div><Eye /><span><b>{visitors.today.pageviews || 0}</b><small>Page views today</small></span></div>
        <div><MousePointerClick /><span><b>{totalClicks}</b><small>Clicks</small></span></div>
        <div><ShoppingCart /><span><b>{totalCarts}</b><small>Quote cart adds</small></span></div>
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
              <small>{row.carts || 0} quote cart · {row.shares} shares · {row.productCount} products</small>
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
                <span className="metric-pair">
                  <span className="click-metric">
                    <b>{product.clicks || 0}</b>
                    <small>clicks</small>
                  </span>
                  <span className="click-metric">
                    <b>{product.carts || 0}</b>
                    <small>cart</small>
                  </span>
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Most added to quote cart</h3>
            <span>Strongest buying interest from the shop.</span>
          </div>
        </div>
        <div className="admin-product-list">
          {topCarts.map((product) => (
            <article key={product.id} className="admin-product-block">
              <div className="admin-product">
                <img src={productImageSrc(product)} alt="" />
                <div>
                  <b>{product.name}</b>
                  <small>{product.categoryName}</small>
                </div>
                <span className="click-metric">
                  <b>{product.carts || 0}</b>
                  <small>cart adds</small>
                </span>
              </div>
            </article>
          ))}
          {topCarts.length === 0 && <p className="empty-state">No quote cart adds recorded yet.</p>}
        </div>
      </div>
    </>
  )
}
