import { StoreTracker } from '@/components/store/store-tracker'

export default function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; phone?: string }>
}) {
  return <StoreTracker searchParams={searchParams} />
}
