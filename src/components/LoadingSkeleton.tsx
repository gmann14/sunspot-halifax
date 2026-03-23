export function MapSkeleton() {
  return (
    <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
      <div className="text-gray-300 text-sm">Loading map...</div>
    </div>
  )
}

export function VenueCardSkeleton() {
  return (
    <div className="px-4 py-3 border-b border-gray-50 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <div className="h-4 w-40 bg-gray-200 rounded" />
          </div>
          <div className="h-3 w-56 bg-gray-100 rounded mt-1.5" />
          <div className="h-1.5 w-full bg-gray-100 rounded mt-2" />
        </div>
        <div className="text-right">
          <div className="h-3 w-16 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  )
}

export function VenueListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <VenueCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function VenueDetailSkeleton() {
  return (
    <div className="animate-pulse p-4">
      <div className="w-full h-40 bg-gray-200 rounded-lg mb-3" />
      <div className="h-6 w-48 bg-gray-200 rounded mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded mb-2" />
      <div className="h-4 w-32 bg-gray-100 rounded mb-4" />
      <div className="h-3 w-full bg-gray-100 rounded mb-4" />
      <div className="flex gap-3">
        <div className="flex-1 h-10 bg-gray-200 rounded-lg" />
        <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
        <div className="w-16 h-10 bg-gray-100 rounded-lg" />
      </div>
    </div>
  )
}
