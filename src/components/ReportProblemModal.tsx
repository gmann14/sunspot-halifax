'use client'

import { useState } from 'react'
import { useToast } from './Toast'
import type { VenueWithForecast } from '@/types'

interface ReportProblemModalProps {
  venue: VenueWithForecast
  open: boolean
  onClose: () => void
}

const REPORT_TYPES = [
  { value: 'correction', label: 'Wrong info (hours, no patio, etc.)' },
  { value: 'closure_report', label: 'Closed permanently' },
] as const

export default function ReportProblemModal({
  venue,
  open,
  onClose,
}: ReportProblemModalProps) {
  const { showToast } = useToast()
  const [reportType, setReportType] = useState<'correction' | 'closure_report'>('correction')
  const [details, setDetails] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setSubmitting(true)
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          venue_id: venue.id,
          venue_name: venue.name,
          submission_type: reportType,
          details: details.trim() || null,
          honeypot: honeypot || undefined,
        }),
      })

      if (!res.ok) {
        showToast('Something went wrong. Please try again.', 'error')
        return
      }

      showToast('Thanks for the report! We\'ll look into it.')
      setDetails('')
      setReportType('correction')
      onClose()
    } catch {
      showToast('Network error. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog" aria-labelledby="report-modal-title">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-xl max-h-[70vh] overflow-y-auto animate-slide-up">
        <div className="flex justify-center pt-3 pb-1" aria-hidden="true">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <form onSubmit={handleSubmit} className="px-4 pb-6">
          <h2 id="report-modal-title" className="text-lg font-bold mb-1">Report a Problem</h2>
          <p className="text-sm text-gray-500 mb-4">{venue.name}</p>

          <fieldset>
            <legend className="text-sm font-medium text-gray-700 mb-2">
              What&apos;s wrong?
            </legend>
            {REPORT_TYPES.map((rt) => (
              <label
                key={rt.value}
                className="flex items-center gap-2 py-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="report_type"
                  value={rt.value}
                  checked={reportType === rt.value}
                  onChange={() => setReportType(rt.value)}
                  className="accent-amber-500"
                />
                <span className="text-sm">{rt.label}</span>
              </label>
            ))}
          </fieldset>

          <label className="block text-sm font-medium text-gray-700 mb-1 mt-3">
            Details (optional)
          </label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Tell us more..."
            rows={2}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          />

          {/* Honeypot */}
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
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sending...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
