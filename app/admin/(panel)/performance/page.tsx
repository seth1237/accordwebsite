import { Eye, MousePointerClick, Plus, ShoppingCart, Users } from 'lucide-react'
import { AdminVisitorReport } from '@/components/admin-visitor-report'
import { getCategoryPerformance, getFullCatalog, getVisitorReport } from '@/lib/site-data'
import { formatKes, productImageSrc } from '@/lib/catalog'
import { emptyVisitorReport } from '@/lib/visitor-report'

export default async function AdminPerformancePage() {
  const catalog = await getFullCatalog()
  const [categoryPerformance, visitors] = await Promise.all([
    getCategoryPerformance().catch(() => []),
    getVisitorReport({ period: 'daily' }).catch(() => emptyVisitorReport('daily')),
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
      productsClicked: byId.get(category._id)?.productsClicked || 0,
    }))
    .sort((a, b) => b.clicks - a.clicks)
  const maxClicks = Math.max(1, ...categoryStats.map((row) => row.clicks))
  const ranked = [...catalog.products]
    .filter((product) => product.clicks || product.shares)
    .sort((a, b) => (b.clicks || 0) - (a.clicks || 0) || (b.shares || 0) - (a.shares || 0))
    .slice(0, 20)
  const cartRanked = [...catalog.products]
    .filter((product) => product.carts)
    .sort((a, b) => (b.carts || 0) - (a.carts || 0) || (b.clicks || 0) - (a.clicks || 0))
    .slice(0, 20)
  const maxCarts = Math.max(1, ...cartRanked.map((product) => product.carts || 0))

  return (
    <div className="admin-performance">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">Accord Medical Supplies</span>
          <h1>Performance</h1>
          <p className="admin-header-note">Traffic and product activity from the live site.</p>
        </div>
      </header>
      <div className="admin-stats">
        <div><Eye /><span><b>{visitors.today.pageviews}</b><small>Page views today</small></span></div>
        <div><Users /><span><b>{visitors.today.visitors}</b><small>Visitors today</small></span></div>
        <div><Plus /><span><b>{visitors.today.newVisitors}</b><small>New visitors today</small></span></div>
        <div><MousePointerClick /><span><b>{totalClicks}</b><small>Product clicks</small></span></div>
        <div><ShoppingCart /><span><b>{totalCarts}</b><small>Quote cart adds</small></span></div>
      </div>
      <AdminVisitorReport initial={visitors} />
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Quote cart interest</h3>
            <span>Products added to the quote cart most often. Each add from the shop counts once.</span>
          </div>
        </div>
        <div className="category-perf-list">
          {cartRanked.map((product) => (
            <div key={product.id} className="category-perf">
              <div className="category-perf-head">
                <b>{product.name}</b>
                <strong>{product.carts}</strong>
              </div>
              <div className="category-perf-bar" aria-hidden="true">
                <span style={{ width: `${Math.round(((product.carts || 0) / maxCarts) * 100)}%` }} />
              </div>
              <small>{product.categoryName} · {product.clicks || 0} clicks · {product.shares || 0} shares</small>
            </div>
          ))}
          {cartRanked.length === 0 && (
            <p className="empty-state">No quote cart adds recorded yet. Counts start when a visitor adds a product to the quote cart.</p>
          )}
        </div>
      </div>
      <div className="admin-card category-metrics">
        <div className="card-title">
          <div>
            <h3>By category</h3>
            <span>Clicks first, then quote cart adds.</span>
          </div>
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
              <small>{row.carts} quote cart · {row.shares} shares · {row.productsClicked} products clicked · {row.productCount} in catalogue</small>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-card">
        <div className="card-title">
          <div>
            <h3>Product activity</h3>
            <span>Highest click counts first.</span>
          </div>
        </div>
        <div className="admin-product-list">
          {ranked.map((product) => (
            <article key={product.id} className="admin-product-block">
              <div className="admin-product">
                <img src={productImageSrc(product)} alt="" />
                <div>
                  <b>{product.name}</b>
                  <small>{product.categoryName} · {formatKes(product.price)}</small>
                </div>
                <span className="metric-pair">
                  <span className="click-metric"><b>{product.clicks || 0}</b><small>clicks</small></span>
                  <span className="click-metric"><b>{product.carts || 0}</b><small>cart</small></span>
                  <span className="click-metric"><b>{product.shares || 0}</b><small>shares</small></span>
                </span>
              </div>
            </article>
          ))}
          {ranked.length === 0 && <p className="empty-state">No clicks or shares recorded yet.</p>}
        </div>
      </div>
    </div>
  )
}
