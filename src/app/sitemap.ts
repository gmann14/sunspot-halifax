import type { MetadataRoute } from 'next'
import { getSupabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sunspot-halifax.vercel.app'

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: `${baseUrl}/sunny-now`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Fetch all venue slugs
  const db = getSupabase()
  if (!db) return staticPages

  const { data: venues } = await db
    .from('venues')
    .select('slug, updated_at')
    .order('name')

  const venuePages: MetadataRoute.Sitemap = (venues ?? []).map((v) => ({
    url: `${baseUrl}/venue/${v.slug}`,
    lastModified: v.updated_at ? new Date(v.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...venuePages]
}
