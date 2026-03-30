'use client'

import { useState } from 'react'
import { useToast } from './Toast'

interface SuggestPatioModalProps {
  open: boolean
  onClose: () => void
}

export default function SuggestPatioModal({ open, onClose }: SuggestPatioModalProps) {
  const { showToast } = useToast()
  const [venueName, setVenueName] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!venueName.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_name: venueName.trim(),
          submission_type: 'new_patio',
          details: [address.trim(), notes.trim()].filter(Boolean).join(' | ') || null,
          honeypot: honeypot || undefined,
        }),
      })

      if (!res.ok) {
        showToast('Something went wrong. Please try again.', 'error')
        return
      }

      showToast('Thanks! We\'ll review your suggestion.')
      setVenueName('')
      setAddress('')
      setNotes('')
      onClose()
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-labelledby="suggest-modal-title">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-6">
          <h2 id="suggest-modal-title" className="text-lg font-bold mb-4">Suggest a Patio</h2>

          <label className="block text-sm font-medium text-gray-700 mb-1">
            Venue name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="e.g. The Old Triangle"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
            Address
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g. 5136 Prince St"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else? (rooftop, seasonal, etc.)"
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          {/* Honeypot — hidden from users */}
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute opacity-0 h-0 w-0 pointer-events-none"
          />

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !venueName.trim()}
              className="flex-1 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
