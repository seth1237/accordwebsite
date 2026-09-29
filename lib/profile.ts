import type { CompanyProfilePage } from '@/lib/content'
import { COMPANY } from '@/lib/utils'

export function defaultCompanyProfilePages(): CompanyProfilePage[] {
  return [
    {
      _id: 'cover',
      title: 'Company Profile',
      body: `${COMPANY.name}\n${COMPANY.tagline}\n\nMedical equipment, laboratory supplies, and clinical consumables for hospitals and clinics across Kenya.`,
      image: null,
      order: 1,
      published: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      _id: 'who',
      title: 'Who we are',
      body: `${COMPANY.name} is an importer, distributor, and accredited dealer — not a manufacturer.\nWe have an office at ${COMPANY.location} and a warehouse at ${COMPANY.warehouse}.\nWe serve hospitals and clinics in Kenya and Uganda.`,
      image: null,
      order: 2,
      published: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      _id: 'work',
      title: 'What we do',
      body: 'Procurement of medical equipment and clinical consumables.\nInstallation, commissioning, calibration, and preventive maintenance.\nStaff training and warranty support so facilities stay operational.',
      image: null,
      order: 3,
      published: true,
      createdAt: '',
      updatedAt: '',
    },
    {
      _id: 'reach',
      title: 'Talk to us',
      body: `${COMPANY.hours}\n${COMPANY.email}\n${COMPANY.salesEmail}\n${COMPANY.phone}\n${COMPANY.phoneSecondary}`,
      image: null,
      order: 4,
      published: true,
      createdAt: '',
      updatedAt: '',
    },
  ]
}
