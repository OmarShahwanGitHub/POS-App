'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    Square?: any
  }
}

interface SquarePaymentFormProps {
  amount: number
  onPaymentSuccess: (token: string) => void
  onCancel: () => void
}

export function SquarePaymentForm({
  amount,
  onPaymentSuccess,
  onCancel,
}: SquarePaymentFormProps) {
  const [card, setCard] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string>('')
  const cardContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const initializeSquare = async () => {
      if (!window.Square) {
        console.error('Square.js failed to load')
        setError('Payment system failed to load. Please refresh the page.')
        return
      }

      try {
        const payments = window.Square.payments(
          process.env.NEXT_PUBLIC_SQUARE_APP_ID!,
          process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID!
        )

        const cardInstance = await payments.card()
        await cardInstance.attach('#card-container')
        setCard(cardInstance)
      } catch (e: any) {
        console.error('Failed to initialize Square card:', e)
        setError('Failed to initialize payment form: ' + e.message)
      }
    }

    initializeSquare()

    return () => {
      if (card) {
        card.destroy()
      }
    }
  }, [])

  const handlePayment = async () => {
    if (!card) {
      setError('Payment form not ready')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const result = await card.tokenize()

      if (result.status === 'OK') {
        onPaymentSuccess(result.token)
      } else {
        let errorMessage = 'Payment failed'
        if (result.errors) {
          errorMessage = result.errors.map((e: any) => e.message).join(', ')
        }
        setError(errorMessage)
        setIsProcessing(false)
      }
    } catch (e: any) {
      console.error('Payment error:', e)
      setError('Payment processing failed: ' + e.message)
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold">
        Total: ${amount.toFixed(2)}
      </div>

      <div
        id="card-container"
        ref={cardContainerRef}
        className="min-h-[100px] rounded border p-4"
      />

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          onClick={handlePayment}
          disabled={!card || isProcessing}
          className="flex-1"
        >
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          disabled={isProcessing}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
