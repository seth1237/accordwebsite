import type { Metadata } from 'next'
import { Mail, MapPin, Phone, Clock, Warehouse, Share2 } from 'lucide-react'
import { ContactForm } from '@/components/contact-form'
import { SiteFooter } from '@/components/site-footer'
import { SiteHeader } from '@/components/site-header'
import { SocialLinks } from '@/components/social-links'
import { Breadcrumbs, HOME_CRUMB } from '@/components/breadcrumbs'
import { pageMetadata } from '@/lib/seo'
import { ROUTES } from '@/lib/routes'
import { COMPANY } from '@/lib/utils'

export const metadata: Metadata = pageMetadata({
  title: 'Contact Accord Medical Supplies | Eldoret Office & Nairobi Warehouse',
  description: `Call ${COMPANY.phone} or email ${COMPANY.email}. Accord Medical Supplies Ltd — Eldoret sales office and Nairobi warehouse on Baba Dogo Road.`,
  path: ROUTES.contact,
  absoluteTitle: true,
})

export default function ContactPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section id="contact" className="shell section contact-page">
        <Breadcrumbs items={[HOME_CRUMB, { name: 'Contact', path: ROUTES.contact }]} />
        <span className="kicker">Get in touch</span>
        <h1 className="page-title">Contact <em>us.</em></h1>
        <p className="hero-lede">
          Reach {COMPANY.name} for medical equipment, laboratory supplies, and quotes. Sales in Eldoret,
          warehouse dispatch from Nairobi.
        </p>
        <div className="contact-grid">
          <div className="contact-details">
            <article>
              <MapPin size={18} />
              <div>
                <h2 className="contact-label">Office / sales</h2>
                <p>{COMPANY.location}</p>
              </div>
            </article>
            <article>
              <Warehouse size={18} />
              <div>
                <h2 className="contact-label">Warehouse</h2>
                <p>{COMPANY.warehouse}</p>
              </div>
            </article>
            <article>
              <Phone size={18} />
              <div>
                <h2 className="contact-label">Phone / WhatsApp</h2>
                <p><a href={COMPANY.phoneHref}>{COMPANY.phone}</a></p>
                <p><a href={COMPANY.phoneSecondaryHref}>{COMPANY.phoneSecondary}</a></p>
              </div>
            </article>
            <article>
              <Mail size={18} />
              <div>
                <h2 className="contact-label">Email</h2>
                <p><a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
                <p><a href={`mailto:${COMPANY.salesEmail}`}>{COMPANY.salesEmail}</a></p>
              </div>
            </article>
            <article>
              <Clock size={18} />
              <div>
                <h2 className="contact-label">Hours</h2>
                <p>{COMPANY.hours}</p>
              </div>
            </article>
            <article>
              <Share2 size={18} />
              <div>
                <h2 className="contact-label">Follow Accord</h2>
                <p>X, Instagram, Facebook, LinkedIn and TikTok — same company as this website.</p>
                <SocialLinks labeled />
              </div>
            </article>
          </div>
          <ContactForm />
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
