import Link from 'next/link'

export default function VenueNotFound() {
  return (
    <div className="min-h-dvh bg-white flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Venue not found</h1>
      <p className="text-gray-500 mb-6">
        This venue doesn&apos;t exist or may have been removed.
      </p>
      <Link
        href="/"
        className="px-6 py-3 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
      >
        Browse all patios →
      </Link>
    </div>
  )
}
