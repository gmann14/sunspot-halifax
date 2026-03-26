'use client'

import { useState, useCallback } from 'react'

interface ShareButtonProps {
  url: string
  title: string
  text?: string
  className?: string
}

export default function ShareButton({ url, title, text, className }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = useCallback(async () => {
    const shareData = { title, text: text ?? title, url }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        // User cancelled or share failed — ignore
      }
      return
    }

    // Clipboard fallback
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API denied — ignore
    }
  }, [url, title, text])

  return (
    <button
      onClick={handleShare}
      className={className}
      aria-label={copied ? 'Link copied' : 'Share venue'}
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
