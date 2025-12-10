'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function HistoryPage() {
  const { data: orders } = trpc.order.getAll.useQuery()
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())

  // Group orders by date
  const ordersByDate = orders?.reduce((acc, order) => {
    const date = new Date(order.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/New_York',
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(order)
    return acc
  }, {} as Record<string, typeof orders>)

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'READY':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'PREPARING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Order History</h1>
          <p className="text-muted-foreground">View all past orders organized by date</p>
        </div>

        <div className="space-y-4">
          {ordersByDate && Object.entries(ordersByDate).map(([date, dateOrders]) => {
            const isExpanded = expandedDates.has(date)
            const totalRevenue = dateOrders.reduce((sum, order) => sum + order.total, 0)

            return (
              <Card key={date}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleDate(date)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <CardTitle>{date}</CardTitle>
                        <CardDescription>
                          {dateOrders.length} {dateOrders.length === 1 ? 'order' : 'orders'} •
                          ${totalRevenue.toFixed(2)} total revenue
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Click to {isExpanded ? 'collapse' : 'expand'}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent>
                    <div className="space-y-3">
                      {dateOrders.map((order) => (
                        <div
                          key={order.id}
                          className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="font-semibold text-lg">
                                  Order #{order.orderNumber}
                                </div>
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(
                                    order.status
                                  )}`}
                                >
                                  {order.status}
                                </span>
                              </div>

                              <div className="text-sm text-muted-foreground mb-3">
                                {order.customerName && (
                                  <span className="mr-3">Customer: {order.customerName}</span>
                                )}
                                <span className="mr-3">
                                  {new Date(order.createdAt).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    timeZone: 'America/New_York',
                                  })}
                                </span>
                                <span className="mr-3">{order.paymentMethod}</span>
                                <span>{order.orderType.replace('_', ' ')}</span>
                              </div>

                              <div className="space-y-2">
                                {order.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-start justify-between text-sm"
                                  >
                                    <div className="flex-1">
                                      <div className="font-medium">
                                        {item.quantity}x {item.menuItem.name}
                                      </div>
                                      {item.customizations && item.customizations.length > 0 && (
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {item.customizations.map((c) => (
                                            <span key={c.id} className="mr-2">
                                              • {c.name}
                                              {c.price > 0 && ` (+$${c.price.toFixed(2)})`}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    <div className="font-medium">
                                      ${(item.price * item.quantity).toFixed(2)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="ml-6 text-right">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">
                                  Subtotal: ${order.subtotal.toFixed(2)}
                                </div>
                                {order.tax > 0 && (
                                  <div className="text-xs text-muted-foreground">
                                    Processing Fee: ${order.tax.toFixed(2)}
                                  </div>
                                )}
                                <div className="text-sm text-muted-foreground mb-1">Total</div>
                                <div className="text-2xl font-bold text-primary">
                                  ${order.total.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {(!ordersByDate || Object.keys(ordersByDate).length === 0) && (
            <Card>
              <CardContent className="flex h-64 items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">No orders found</p>
                  <p className="text-sm">Orders will appear here once they are placed</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
