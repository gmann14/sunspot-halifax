import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get('title') ?? 'SunSpot Halifax'
  const status = searchParams.get('status') ?? 'Find sunny patios in Halifax'
  const confidence = searchParams.get('confidence') ?? ''

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-end',
          width: '100%',
          height: '100%',
          padding: '60px',
          background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #F59E0B 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 24,
            color: '#92400E',
            marginBottom: 8,
            display: 'flex',
          }}
        >
          ☀️ SunSpot Halifax
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: '#1F2937',
            lineHeight: 1.2,
            marginBottom: 16,
            display: 'flex',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 28,
            color: '#78350F',
            display: 'flex',
          }}
        >
          {status}
        </div>
        {confidence && (
          <div
            style={{
              fontSize: 18,
              color: '#92400E',
              marginTop: 8,
              opacity: 0.7,
              display: 'flex',
            }}
          >
            {confidence}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
