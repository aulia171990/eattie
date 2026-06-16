import { getCustomCakeRequests } from '@/actions/custom-cakes'
import { CustomCakeDashboard } from './custom-cake-dashboard'

export const metadata = { title: 'Custom Cake — Dashboard' }
export const revalidate = 0

export default async function CustomCakesPage() {
  const requests = await getCustomCakeRequests()
  return <CustomCakeDashboard initialRequests={requests} />
}
