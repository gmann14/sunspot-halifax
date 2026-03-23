'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import type { VenueWithForecast } from '@/types'
import { HALIFAX_CENTER, MAP_DEFAULT_ZOOM, MAP_PIN_MIN_ZOOM } from '@/lib/constants'

interface MapProps {
  venues: VenueWithForecast[]
  selectedVenue: VenueWithForecast | null
  onVenueClick: (venue: VenueWithForecast) => void
  onMapInteraction?: () => void
  selectedTime: Date
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
  const markersRef = useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = useState(false)
  const [webglSupported, setWebglSupported] = useState(true)

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !token) return

    // Check WebGL support
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setWebglSupported(false)
      return
    }

    mapboxgl.accessToken = token

    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [HALIFAX_CENTER.lng, HALIFAX_CENTER.lat],
      zoom: MAP_DEFAULT_ZOOM,
      maxBounds: [
        [-63.65, 44.60], // SW
        [-63.50, 44.70], // NE
      ],
      pitchWithRotate: false,
      maxPitch: 0,
    })

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')
    map.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: false,
    }), 'top-right')

    map.on('load', () => {
      setMapLoaded(true)
    })

    map.on('movestart', () => {
      onMapInteraction?.()
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Update markers when venues change
  const updateMarkers = useCallback(() => {
    if (!mapRef.current || !mapLoaded) return

    // Remove old markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const map = mapRef.current

    venues.forEach((venue) => {
      const isSunny = venue.current_status === 'sun'
      const isSelected = selectedVenue?.id === venue.id

      // Create marker element
      const el = document.createElement('div')
      el.className = 'venue-marker'
      el.style.cssText = `
        width: ${isSelected ? '36px' : '28px'};
        height: ${isSelected ? '36px' : '28px'};
        border-radius: 50%;
        background: ${isSunny ? '#F59E0B' : venue.current_status === 'shade' ? '#9CA3AF' : '#D1D5DB'};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        transition: width 0.15s, height 0.15s;
        min-width: 44px;
        min-height: 44px;
      `
      el.setAttribute('role', 'button')
      el.setAttribute(
        'aria-label',
        `${venue.name}, ${venue.current_status ?? 'unknown'} predicted, ${venue.patio_confidence}`
      )

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([venue.lng, venue.lat])
        .addTo(map)

      el.addEventListener('click', () => {
        onVenueClick(venue)
      })

      markersRef.current.push(marker)
    })
  }, [venues, selectedVenue, mapLoaded, onVenueClick])

  useEffect(() => {
    updateMarkers()
  }, [updateMarkers])

  // Recenter on selected venue
  useEffect(() => {
    if (selectedVenue && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedVenue.lng, selectedVenue.lat],
        zoom: 16,
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
