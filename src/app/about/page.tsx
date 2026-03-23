import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — SunSpot Halifax',
  description:
    'SunSpot Halifax shows you which patios are in sunlight. Learn how it works.',
}

export default function AboutPage() {
  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-gray-100 px-4 py-3">
        <Link
          href="/"
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          ← Back
        </Link>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">About SunSpot Halifax</h1>

        <div className="space-y-6 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              What is this?
            </h2>
            <p>
              SunSpot Halifax helps you find sunny patios in downtown Halifax.
              Using building geometry and sun position data, we predict which
              patios are in sunlight at any time of day.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              How does it work?
            </h2>
            <p>
              We calculate the sun&apos;s position throughout the day and check
              whether nearby buildings block the sunlight for each patio. These
              predictions are updated every 15 minutes and assume clear sky
              conditions.
            </p>
            <p className="mt-2">
              On cloudy or rainy days, the weather banner at the top lets you
              know that actual sunlight conditions may differ from our clear-sky
              predictions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              How accurate is it?
            </h2>
            <p>
              Our predictions use estimated patio locations and available
              building height data. Accuracy varies — venues marked
              &quot;Verified&quot; have confirmed patio locations, while
              &quot;Estimated&quot; locations are our best guess.
            </p>
            <p className="mt-2">
              The model doesn&apos;t account for trees, awnings, or terrain.
              Consider our predictions a helpful guide, not a guarantee.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Can I help improve it?
            </h2>
            <p>
              Yes! Use the &quot;Suggest a Patio&quot; button to add venues we&apos;re
              missing, or &quot;Report a Problem&quot; on any venue card to let
              us know if something&apos;s wrong.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Data sources
            </h2>
            <ul className="list-disc list-inside space-y-1">
              <li>Sun positions: SunCalc</li>
              <li>Building data: Overture Maps Foundation + OpenStreetMap</li>
              <li>Venue data: Google Places</li>
              <li>Weather: Environment Canada</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  )
}
