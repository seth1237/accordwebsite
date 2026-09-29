import { AdminSettingsForm } from '@/components/admin-settings-form'
import { getPriceVisibility } from '@/lib/site-data'

export default async function AdminSettingsPage() {
  const showPrices = await getPriceVisibility()
  return <AdminSettingsForm showPrices={showPrices} />
}
