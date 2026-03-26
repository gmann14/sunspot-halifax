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

  const typeName =
    venue.type === 'bar' ? 'Bar'
    : venue.type === 'restaurant' ? 'Restaurant'
    : venue.type === 'cafe' ? 'Cafe'
    : 'Brewery'

  return {
    title: `${venue.name} — SunSpot Halifax`,
    description: `${statusText}. ${confidenceText}. Sun predictions for ${venue.name} patio in Halifax. ${typeName}${venue.address ? ` at ${venue.address}` : ''}.`,
    openGraph: {
      title: `${venue.name} — SunSpot Halifax`,
      description: statusText,
      type: 'website',
      locale: 'en_CA',
      siteName: 'SunSpot Halifax',
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(venue.name)}&status=${encodeURIComponent(statusText)}&confidence=${encodeURIComponent(confidenceText)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${venue.name} — SunSpot Halifax`,
      description: statusText,
    },
    alternates: {
      canonical: `/venue/${venue.slug}`,
    },
  }
}

function buildJsonLd(venue: Awaited<ReturnType<typeof getVenueBySlug>>) {
  if (!venue) return null

  const priceRange =
    venue.price_level === 1 ? '$'
    : venue.price_level === 2 ? '$$'
    : venue.price_level === 3 ? '$$$'
    : venue.price_level === 4 ? '$$$$'
    : undefined

  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: venue.name,
    ...(venue.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: venue.address,
        addressLocality: 'Halifax',
        addressRegion: 'NS',
        addressCountry: 'CA',
      },
    }),
    geo: {
      '@type': 'GeoCoordinates',
      latitude: venue.lat,
      longitude: venue.lng,
    },
    ...(venue.rating && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: venue.rating,
        bestRating: 5,
      },
    }),
    ...(venue.website && { url: venue.website }),
    ...(venue.phone && { telephone: venue.phone }),
    ...(priceRange && { priceRange }),
    ...(venue.photos?.[0]?.url && { image: venue.photos[0].url }),
  }
}

export default async function VenueSlugPage({ params }: Props) {
  const { slug } = await params
  const venue = await getVenueBySlug(slug)

  if (!venue) {
    notFound()
  }

  const jsonLd = buildJsonLd(venue)

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <VenueDetailPage venue={venue} />
    </>
  )
}
