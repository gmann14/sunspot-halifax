import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getVenueBySlug } from '@/lib/data'
import VenueDetailPage from './VenueDetailPage'

export const revalidate = 900

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)

  if (!venue) {
    return { title: 'Venue Not Found — SunSpot Halifax' }
  }

  const statusText =
    venue.current_status === 'sun'
      ? 'Currently sunny'
      : venue.current_status === 'shade'
        ? 'Currently in shade'
        : 'Sun status unknown'

  const confidenceText =
    venue.patio_confidence === 'verified'
      ? 'Verified patio location'
      : 'Estimated patio location'

  return {
    title: `${venue.name} — SunSpot Halifax`,
    description: `${statusText}. ${confidenceText}. Sun predictions for ${venue.name} patio in Halifax.`,
    openGraph: {
      title: `${venue.name} — SunSpot Halifax`,
      description: statusText,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(venue.name)}&status=${encodeURIComponent(statusText)}&confidence=${encodeURIComponent(confidenceText)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  }
}

export default async function VenueSlugPage({ params }: Props) {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)

  if (!venue) {
    notFound()
  }

  return <VenueDetailPage venue={venue} />
}
