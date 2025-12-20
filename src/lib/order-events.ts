import { EventEmitter } from 'events'

// Create a singleton EventEmitter for order events
class OrderEventEmitter extends EventEmitter {}

export const orderEvents = new OrderEventEmitter()

// Event types
export type OrderEventType = 'order.created' | 'order.updated' | 'order.status.changed'

export interface OrderEvent {
  type: OrderEventType
  orderId: string
  orderNumber?: number
  status?: string
  timestamp: Date
}

