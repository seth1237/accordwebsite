import Link from 'next/link'
import { listJobs } from '@/lib/mongodb'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export async function SiteFooter() {
  const jobCount = (await listJobs(true).catch(() => [])).length
  return (
    <footer>
      <div className="shell footer-split">
        <div className="footer-side footer-brand">
          <div className="footer-contact">
            <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>
            <a href={`mailto:${COMPANY.salesEmail}`}>{COMPANY.salesEmail}</a>
            <a href={COMPANY.phoneHref}>{COMPANY.phone}</a>
            <a href={COMPANY.phoneSecondaryHref}>{COMPANY.phoneSecondary}</a>
            <a href={`https://wa.me/${COMPANY.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp {COMPANY.phone}</a>
            <span>{COMPANY.location}</span>
            <span>{COMPANY.warehouse}</span>
          </div>
        </div>
        <div className="footer-side footer-nav">
          <div className="footer-col">
            <strong>Explore</strong>
            <Link href={ROUTES.products}>Products</Link>
            <Link href={ROUTES.about}>About</Link>
            <Link href={ROUTES.news}>News</Link>
            <Link href={ROUTES.jobs} className="nav-label">
              Careers
              {jobCount > 0 ? <span className="nav-count">{jobCount}</span> : null}
            </Link>
            <Link href={ROUTES.contact}>Contact</Link>
          </div>
          <div className="footer-col">
            <strong>More</strong>
            <Link href={ROUTES.projects}>Projects</Link>
            <Link href={ROUTES.offers}>Offers</Link>
            <Link href={ROUTES.events}>Events</Link>
            <Link href={ROUTES.manufacturers}>Manufacturers</Link>
            <Link href={ROUTES.quote}>Request Quote</Link>
          </div>
        </div>
      </div>
      <div className="shell footer-bottom">
        <span>© {new Date().getFullYear()} {COMPANY.name}</span>
        <a className="builder-credit" href={COMPANY.builderUrl} target="_blank" rel="noopener noreferrer">
          <span className="builder-logo-wrap">
            <img src="/codewithseth-logo.jpg" alt={COMPANY.builderName} />
          </span>
          <span>System designed, built and managed by {COMPANY.builderName}</span>
        </a>
      </div>
    </footer>
  )
}
