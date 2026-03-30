'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import type { VenueWithForecast } from '@/types'
import { HALIFAX_CENTER, MAP_DEFAULT_ZOOM } from '@/lib/constants'
import { trackEvent } from '@/lib/analytics'

interface MapProps {
  venues: VenueWithForecast[]
  selectedVenue: VenueWithForecast | null
  onVenueClick: (venue: VenueWithForecast) => void
  onMapInteraction?: () => void
  selectedTime: Date
}

const SOURCE_ID = 'venues'
const CLUSTER_LAYER = 'venue-clusters'
const CLUSTER_COUNT_LAYER = 'venue-cluster-count'
const PIN_LAYER = 'venue-pins'
const SELECTED_PIN_LAYER = 'venue-pin-selected'

function venueToGeoJSON(venues: VenueWithForecast[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: venues.map((v) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [v.lng, v.lat] },
      properties: {
        id: v.id,
        name: v.name,
        status: v.current_status ?? 'unknown',
        confidence: v.patio_confidence,
      },
    })),
  }
}

export default function Map({
  venues,
  selectedVenue,
  onVenueClick,
  onMapInteraction,
  selectedTime,
}: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const shadeMapRef = useRef<ReturnType<typeof Object> | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [webglSupported, setWebglSupported] = useState(true)
  const venuesRef = useRef(venues)
  venuesRef.current = venues

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const shadeMapKey = process.env.NEXT_PUBLIC_SHADEMAP_KEY

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) return

    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setWebglSupported(false)
      trackEvent('webgl_fallback')
      return
    }

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [HALIFAX_CENTER.lng, HALIFAX_CENTER.lat],
      zoom: MAP_DEFAULT_ZOOM,
      maxBounds: [
        [-63.65, 44.60],
        [-63.50, 44.70],
      ],
      pitchWithRotate: false,
      maxPitch: 0,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
      }),
      'top-right'
    )

    map.on('load', () => {
      // Add GeoJSON source with clustering
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: venueToGeoJSON(venuesRef.current),
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 50,
      })

      // Cluster circles
      map.addLayer({
        id: CLUSTER_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#F59E0B',
          'circle-radius': ['step', ['get', 'point_count'], 20, 5, 25, 10, 30],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Cluster count labels
      map.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      })

      // Individual venue pins (unclustered)
      map.addLayer({
        id: PIN_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'match',
            ['get', 'status'],
            'sun', '#F59E0B',
            'shade', '#9CA3AF',
            '#D1D5DB',
          ],
          'circle-radius': 10,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      })

      // Selected venue ring
      map.addLayer({
        id: SELECTED_PIN_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        filter: ['==', ['get', 'id'], ''],
        paint: {
          'circle-color': 'transparent',
          'circle-radius': 16,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#F59E0B',
        },
      })

      // Cluster click → zoom in
      map.on('click', CLUSTER_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] })
        if (!features.length) return
        const clusterId = features[0].properties?.cluster_id as number | undefined
        if (clusterId == null) return
        const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource
        source.getClusterExpansionZoom(clusterId, ((err: unknown, zoom: unknown) => {
          if (err) return
          const geom = features[0].geometry
          if (geom.type !== 'Point') return
          map.easeTo({
            center: geom.coordinates as [number, number],
            zoom: (zoom as number) ?? 16,
          })
        }) as Parameters<typeof source.getClusterExpansionZoom>[1])
      })

      // Pin click → show venue detail
      map.on('click', PIN_LAYER, (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [PIN_LAYER] })
        if (!features.length) return
        const venueId = features[0].properties?.id
        const venue = venuesRef.current.find((v) => v.id === venueId)
        if (venue) onVenueClick(venue)
      })

      // Cursor pointers for interactive layers
      for (const layer of [CLUSTER_LAYER, PIN_LAYER]) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = ''
        })
      }

      setMapLoaded(true)
    })

    map.on('movestart', () => {
      onMapInteraction?.()
    })

    mapRef.current = map

    return () => {
      if (shadeMapRef.current) {
        try { (shadeMapRef.current as { remove: () => void }).remove() } catch { /* noop */ }
        shadeMapRef.current = null
      }
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Initialize shadow overlay (optional, requires NEXT_PUBLIC_SHADEMAP_KEY)
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !shadeMapKey) return

    let cancelled = false
    import('mapbox-gl-shadow-simulator').then((mod) => {
      if (cancelled || !mapRef.current) return
      const ShadeMap = mod.default
      try {
        const sm = new ShadeMap({
          apiKey: shadeMapKey,
          date: selectedTime,
          color: '#000000',
          opacity: 0.16,
        })
        sm.addTo(mapRef.current)
        shadeMapRef.current = sm
      } catch {
        // Shadow overlay failed — silent degradation
      }
    }).catch(() => {
      // Module import failed — that's fine
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, shadeMapKey])

  // Update shadow time when selectedTime changes
  useEffect(() => {
    if (shadeMapRef.current) {
      try {
        (shadeMapRef.current as { setDate: (d: Date) => void }).setDate(selectedTime)
      } catch { /* noop */ }
    }
  }, [selectedTime])

  // Update GeoJSON data when venues change
  const updateSource = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return
    const source = mapRef.current.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (source) {
      source.setData(venueToGeoJSON(venues))
    }
  }, [venues, mapLoaded])

  useEffect(() => {
    updateSource()
  }, [updateSource])

  // Highlight selected venue
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    mapRef.current.setFilter(SELECTED_PIN_LAYER, [
      '==',
      ['get', 'id'],
      selectedVenue?.id ?? '',
    ])
  }, [selectedVenue, mapLoaded])

  // Fly to selected venue
  useEffect(() => {
    if (selectedVenue && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedVenue.lng, selectedVenue.lat],
        zoom: Math.max(mapRef.current.getZoom(), 16),
        duration: 500,
      })
    }
  }, [selectedVenue])

  if (!token) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
        Map unavailable — Mapbox token not configured
      </div>
    )
  }

  if (!webglSupported) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm px-4 text-center">
        Shadow map requires a modern browser.
        <br />
        Venue list with sun predictions is shown below.
      </div>
    )
  }

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      aria-label="Map of Halifax patios with optional shadow overlay"
      role="application"
    />
  )
}
