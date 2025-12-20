import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { orderEvents } from '@/lib/order-events'
import type { OrderEvent } from '@/lib/order-events'

export async function GET(request: NextRequest) {
  // Check authentication - pass headers for session
  const session = await getServerSession(authOptions)
  
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Check if user has kitchen or admin role
  const allowedRoles = ['KITCHEN', 'ADMIN']
  if (!allowedRoles.includes(session.user.role)) {
    return new Response('Forbidden', { status: 403 })
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()

      // Send initial connection message
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(data))
        } catch (error) {
          console.error('Error sending SSE data:', error)
        }
      }

      // Send initial connection established message
      send('data: {"type":"connected","message":"Stream connected"}\n\n')

      // Listen for order events
      const onOrderEvent = (event: OrderEvent) => {
        const data = JSON.stringify({
          type: event.type,
          orderId: event.orderId,
          orderNumber: event.orderNumber,
          status: event.status,
          timestamp: event.timestamp.toISOString(),
        })
        send(`data: ${data}\n\n`)
      }

      // Subscribe to all order events
      orderEvents.on('order.created', onOrderEvent)
      orderEvents.on('order.updated', onOrderEvent)
      orderEvents.on('order.status.changed', onOrderEvent)

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        orderEvents.off('order.created', onOrderEvent)
        orderEvents.off('order.updated', onOrderEvent)
        orderEvents.off('order.status.changed', onOrderEvent)
        try {
          controller.close()
        } catch (error) {
          // Ignore errors on close
        }
      })

      // Send keepalive every 30 seconds
      const keepaliveInterval = setInterval(() => {
        try {
          send(': keepalive\n\n')
        } catch (error) {
          clearInterval(keepaliveInterval)
        }
      }, 30000)

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval)
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  })
}

