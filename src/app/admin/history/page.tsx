'use client'

import { useState, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import type { RouterOutputs } from '@/server/routers/_app'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

type OrderHistoryItem = RouterOutputs['order']['getOrderHistory'][number]

type Session = {
  sessionNumber: number
  orders: OrderHistoryItem[]
  totalRevenue: number
  cashRevenue: number
  cardRevenue: number
}

export default function HistoryPage() {
  const { data: orders } = trpc.order.getOrderHistory.useQuery()
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())

  // Group orders by date and session
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
  }, {} as Record<string, OrderHistoryItem[]>)

  // Group orders within each date into sessions based on order number resets
  const sessionsByDate = Object.entries(ordersByDate || {}).reduce((acc, [date, dateOrders]) => {
    const sessions: Session[] = []
    let currentSession: OrderHistoryItem[] = []
    let sessionNumber = 1

    // Sort orders by creation time
    const sortedOrders = [...dateOrders].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    sortedOrders.forEach((order, index) => {
      // Detect session reset: if order number is 1 or less than previous order number
      if (index > 0 && order.orderNumber <= sortedOrders[index - 1].orderNumber) {
        // Calculate revenue breakdown for current session
        const cashRevenue = currentSession
          .filter(o => o.paymentMethod === 'CASH')
          .reduce((sum, o) => sum + o.total, 0)
        const cardRevenue = currentSession
          .filter(o => o.paymentMethod === 'CARD' || o.paymentMethod === 'SQUARE')
          .reduce((sum, o) => sum + o.total, 0)
        
        // Save current session and start new one
        sessions.push({
          sessionNumber,
          orders: currentSession,
          totalRevenue: currentSession.reduce((sum, o) => sum + o.total, 0),
          cashRevenue,
          cardRevenue,
        })
        sessionNumber++
        currentSession = [order]
      } else {
        currentSession.push(order)
      }
    })

    // Add the last session
    if (currentSession.length > 0) {
      const cashRevenue = currentSession
        .filter(o => o.paymentMethod === 'CASH')
        .reduce((sum, o) => sum + o.total, 0)
      const cardRevenue = currentSession
        .filter(o => o.paymentMethod === 'CARD' || o.paymentMethod === 'SQUARE')
        .reduce((sum, o) => sum + o.total, 0)
      
      sessions.push({
        sessionNumber,
        orders: currentSession,
        totalRevenue: currentSession.reduce((sum, o) => sum + o.total, 0),
        cashRevenue,
        cardRevenue,
      })
    }

    acc[date] = sessions
    return acc
  }, {} as Record<string, Session[]>)

  // Auto-expand dates with only one session on initial load
  useEffect(() => {
    if (!orders || expandedDates.size > 0) return
    
    const datesWithSingleSession = Object.entries(sessionsByDate)
      .filter(([_, sessions]) => sessions.length === 1)
      .map(([date]) => date)
    
    if (datesWithSingleSession.length > 0) {
      setExpandedDates(new Set(datesWithSingleSession))
    }
  }, [orders, sessionsByDate, expandedDates.size])

  const toggleDate = (date: string) => {
    const newExpanded = new Set(expandedDates)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDates(newExpanded)
  }

  const toggleSession = (dateSessionKey: string) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(dateSessionKey)) {
      newExpanded.delete(dateSessionKey)
    } else {
      newExpanded.add(dateSessionKey)
    }
    setExpandedSessions(newExpanded)
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
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Order History</h1>
          <p className="text-muted-foreground">View all past orders organized by date</p>
        </div>

        <div className="space-y-4">
          {sessionsByDate && Object.entries(sessionsByDate).map(([date, sessions]) => {
            const isDateExpanded = expandedDates.has(date)
            const totalOrders = sessions.reduce((sum, session) => sum + session.orders.length, 0)
            const totalRevenue = sessions.reduce((sum, session) => sum + session.totalRevenue, 0)
            const totalCashRevenue = sessions.reduce((sum, session) => sum + session.cashRevenue, 0)
            const totalCardRevenue = sessions.reduce((sum, session) => sum + session.cardRevenue, 0)
            const isSingleSession = sessions.length === 1
            const singleSession = isSingleSession ? sessions[0] : null

            return (
              <Card key={date}>
                <CardHeader
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleDate(date)}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {isDateExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <CardTitle className="break-words">{date}</CardTitle>
                        <CardDescription className="break-words text-xs sm:text-sm">
                          {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} •
                          ${totalRevenue.toFixed(2)} total
                          {isSingleSession && singleSession ? (
                            <>
                              {' • '}
                              <span className="text-green-600">Cash: ${singleSession.cashRevenue.toFixed(2)}</span>
                              {' • '}
                              <span className="text-blue-600">Card: ${singleSession.cardRevenue.toFixed(2)}</span>
                            </>
                          ) : (
                            <>
                              {' • '}
                              <span className="text-green-600">Cash: ${totalCashRevenue.toFixed(2)}</span>
                              {' • '}
                              <span className="text-blue-600">Card: ${totalCardRevenue.toFixed(2)}</span>
                            </>
                          )}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                      Click to {isDateExpanded ? 'collapse' : 'expand'}
                    </div>
                  </div>
                </CardHeader>

                {isDateExpanded && (
                  <CardContent>
                    <div className="space-y-4">
                      {sessions.map((session) => {
                        const sessionKey = `${date}-session-${session.sessionNumber}`
                        const isSessionExpanded = expandedSessions.has(sessionKey)
                        const isSingleSession = sessions.length === 1

                        // If there's only one session, skip the session header and show orders directly
                        if (isSingleSession) {
                          return (
                            <div key={sessionKey} className="space-y-3">
                              {session.orders.map((order) => (
                                  <div
                                    key={order.id}
                                    className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                          <div className="font-semibold text-base sm:text-lg">
                                            Order #{order.orderNumber}
                                          </div>
                                          <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${getStatusColor(
                                              order.status
                                            )}`}
                                          >
                                            {order.status}
                                          </span>
                                        </div>

                                        <div className="text-xs sm:text-sm text-muted-foreground mb-3 flex flex-wrap gap-x-3 gap-y-1">
                                          {order.customerName && (
                                            <span>Customer: {order.customerName}</span>
                                          )}
                                          <span>
                                            {new Date(order.createdAt).toLocaleTimeString('en-US', {
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              timeZone: 'America/New_York',
                                            })}
                                          </span>
                                          <span>{order.paymentMethod}</span>
                                          <span>{order.orderType.replace('_', ' ')}</span>
                                        </div>

                                        <div className="space-y-2">
                                          {order.items.map((item) => (
                                            <div
                                              key={item.id}
                                              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 text-sm"
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium break-words">
                                                  {item.quantity}x {item.menuItemName}
                                                </div>
                                                {item.customizations && item.customizations.length > 0 && (
                                                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                                                    {item.customizations.map((c) => (
                                                      <span key={c.id}>
                                                        • {c.name}
                                                        {c.price > 0 && ` (+$${c.price.toFixed(2)})`}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="font-medium whitespace-nowrap">
                                                ${(item.price * item.quantity).toFixed(2)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="sm:ml-6 text-left sm:text-right flex-shrink-0">
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
                                          <div className="text-xl sm:text-2xl font-bold text-primary">
                                            ${order.total.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          )
                        }

                        // Multiple sessions - show session header
                        return (
                          <div key={sessionKey} className="border rounded-lg">
                            <div
                              className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
                              onClick={() => toggleSession(sessionKey)}
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {isSessionExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold">Session {session.sessionNumber}</div>
                                    <div className="text-xs sm:text-sm text-muted-foreground break-words">
                                      {session.orders.length} {session.orders.length === 1 ? 'order' : 'orders'} •
                                      ${session.totalRevenue.toFixed(2)} total
                                      {' • '}
                                      <span className="text-green-600">Cash: ${session.cashRevenue.toFixed(2)}</span>
                                      {' • '}
                                      <span className="text-blue-600">Card: ${session.cardRevenue.toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-xs sm:text-sm text-muted-foreground flex-shrink-0">
                                  Click to {isSessionExpanded ? 'collapse' : 'expand'}
                                </div>
                              </div>
                            </div>

                            {isSessionExpanded && (
                              <div className="p-4 pt-0 space-y-3">
                                {session.orders.map((order) => (
                                  <div
                                    key={order.id}
                                    className="rounded-lg border bg-card p-4 hover:bg-muted/50 transition-colors"
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                          <div className="font-semibold text-base sm:text-lg">
                                            Order #{order.orderNumber}
                                          </div>
                                          <span
                                            className={`rounded-full px-2 py-1 text-xs font-semibold whitespace-nowrap ${getStatusColor(
                                              order.status
                                            )}`}
                                          >
                                            {order.status}
                                          </span>
                                        </div>

                                        <div className="text-xs sm:text-sm text-muted-foreground mb-3 flex flex-wrap gap-x-3 gap-y-1">
                                          {order.customerName && (
                                            <span>Customer: {order.customerName}</span>
                                          )}
                                          <span>
                                            {new Date(order.createdAt).toLocaleTimeString('en-US', {
                                              hour: 'numeric',
                                              minute: '2-digit',
                                              timeZone: 'America/New_York',
                                            })}
                                          </span>
                                          <span>{order.paymentMethod}</span>
                                          <span>{order.orderType.replace('_', ' ')}</span>
                                        </div>

                                        <div className="space-y-2">
                                          {order.items.map((item) => (
                                            <div
                                              key={item.id}
                                              className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-2 text-sm"
                                            >
                                              <div className="flex-1 min-w-0">
                                                <div className="font-medium break-words">
                                                  {item.quantity}x {item.menuItemName}
                                                </div>
                                                {item.customizations && item.customizations.length > 0 && (
                                                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
                                                    {item.customizations.map((c) => (
                                                      <span key={c.id}>
                                                        • {c.name}
                                                        {c.price > 0 && ` (+$${c.price.toFixed(2)})`}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              <div className="font-medium whitespace-nowrap">
                                                ${(item.price * item.quantity).toFixed(2)}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      <div className="sm:ml-6 text-left sm:text-right flex-shrink-0">
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
                                          <div className="text-xl sm:text-2xl font-bold text-primary">
                                            ${order.total.toFixed(2)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}

          {(!sessionsByDate || Object.keys(sessionsByDate).length === 0) && (
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
