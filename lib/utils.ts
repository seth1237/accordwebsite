import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const COMPANY = {
  name: 'Accord Medical Supplies Ltd',
  shortName: 'Accord',
  tagline: 'Enabling Healthcare Delivery.',
  domain: 'accordmedical.co.ke',
  url: (process.env.NEXT_PUBLIC_SITE_URL || 'https://accordmedical.co.ke').replace(/\/$/, ''),
  email: 'info@accordmedical.co.ke',
  salesEmail: 'sales@accordmedical.co.ke',
  careersEmail: 'careers@accordmedical.co.ke',
  phone: '+254 729 115000',
  phoneHref: 'tel:+254729115000',
  phoneSecondary: '+254 700 672600',
  phoneSecondaryHref: 'tel:+254700672600',
  whatsapp: '254729115000',
  builderUrl: 'https://codewithseth.co.ke',
  builderName: 'codewithseth.co.ke',
  location: 'Aico Plaza, second floor, room number 8, Eldoret',
  warehouse: 'Unicorn Sales & Services Godowns, Warehouse No. 16, Baba Dogo Road, Nairobi, Kenya',
  hours: 'Monday–Friday 8:00–17:00 · Saturday 9:00–12:00',
  logo: '/logo.png',
}
