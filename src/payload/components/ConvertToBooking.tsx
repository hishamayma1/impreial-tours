'use client'

import { useState } from 'react'
import { useDocumentInfo } from '@payloadcms/ui'

/**
 * "Convert to booking" — rendered as a UI field on QuoteRequests.
 *
 * Deliberately thin: all the work happens server-side in the route handler, which
 * re-checks the caller's permissions rather than trusting that this button rendered.
 */
export const ConvertToBooking = () => {
  const { id } = useDocumentInfo()
  const [status, setStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')

  if (!id) {
    return (
      <p style={{ color: 'var(--theme-elevation-600)' }}>
        Save this quote request before converting it.
      </p>
    )
  }

  const convert = async () => {
    setStatus('working')
    try {
      const response = await fetch('/api/quote-requests/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        setStatus('error')
        setMessage(
          result.error === 'already_converted'
            ? 'This quote has already been converted.'
            : 'Could not convert this quote.',
        )
        return
      }

      setStatus('done')
      setMessage(`Created booking ${result.bookingReference}.`)
    } catch {
      setStatus('error')
      setMessage('Could not convert this quote.')
    }
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <button
        type="button"
        onClick={convert}
        disabled={status === 'working' || status === 'done'}
        className="btn btn--style-primary"
      >
        {status === 'working' ? 'Converting…' : 'Convert to booking'}
      </button>
      {message ? (
        <p
          style={{
            marginTop: '0.5rem',
            color: status === 'error' ? 'var(--theme-error-500)' : 'var(--theme-success-500)',
          }}
        >
          {message}
        </p>
      ) : null}
    </div>
  )
}

export default ConvertToBooking
