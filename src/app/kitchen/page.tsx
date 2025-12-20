'use client'

import { useSession, signOut } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle, AlertCircle, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import AdminNav from '@/components/AdminNav'

export default function KitchenPage() {
  const { data: session } = useSession()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastOrderUpdateTimes, setLastOrderUpdateTimes] = useState<{ [key: string]: Date }>({})
  const { data: orders, refetch, error } = trpc.order.getKitchenOrders.useQuery(undefined, {
    refetchInterval: 60000, // Fallback: Auto-refresh every 60 seconds (longer since we have SSE)
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: false, // Don't retry on auth errors
  })
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => refetch(),
  })

  // Set up Server-Sent Events for real-time updates
  useEffect(() => {
    if (!session?.user) return

    // Only connect if user has kitchen or admin role
    const allowedRoles = ['KITCHEN', 'ADMIN']
    if (!allowedRoles.includes(session.user.role)) return

    const eventSource = new EventSource('/api/orders/stream')

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('SSE connected:', data.message)
          return
        }

        // When we receive an order event, refetch the orders
        if (data.type === 'order.created' || data.type === 'order.updated' || data.type === 'order.status.changed') {
          // Small delay to ensure database is updated
          setTimeout(() => {
            refetch()
          }, 100)
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      // EventSource will automatically reconnect
    }

    // Cleanup on unmount
    return () => {
      eventSource.close()
    }
  }, [session?.user, refetch])

  // Check for order edits and show alerts
  useEffect(() => {
    if (!orders) return

    orders.forEach((order) => {
      const orderKey = order.id
      const lastUpdate = lastOrderUpdateTimes[orderKey]
      const currentUpdate = new Date(order.updatedAt)

      // If this order has been updated since we last saw it
      if (lastUpdate && currentUpdate > lastUpdate) {
        // Show alert for edited order
        alert(`Order #${order.orderNumber} Edited - OK`)
      }

      // Update our tracking
      setLastOrderUpdateTimes((prev) => ({
        ...prev,
        [orderKey]: currentUpdate,
      }))
    })
  }, [orders])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 500) // Show refreshing state for at least 500ms
  }

  const handleStatusUpdate = async (orderId: string, status: 'PREPARING' | 'READY' | 'COMPLETED') => {
    await updateStatus.mutateAsync({ id: orderId, status })
  }

  const handleMarkAllUpToHere = async (orderId: string) => {
    if (!orders) return

    // Find the index of the current order
    const currentIndex = orders.findIndex(order => order.id === orderId)

    // Mark all orders up to and including this one as COMPLETED
    for (let i = 0; i <= currentIndex; i++) {
      if (orders[i].status === 'PENDING' || orders[i].status === 'PREPARING') {
        await updateStatus.mutateAsync({ id: orders[i].id, status: 'COMPLETED' })
      }
    }
  }

  const formatTime = (date: Date | string) => {
    const now = new Date()
    const diffMs = now.getTime() - new Date(date).getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min ago'
    return `${diffMins} mins ago`
  }

  // Consolidate duplicate items with same customizations
  const consolidateOrderItems = (items: any[]) => {
    const consolidated: any[] = []

    items.forEach(item => {
      // Find if there's already an identical item (same name and customizations)
      const existingIndex = consolidated.findIndex(existing => {
        if (existing.menuItem.name !== item.menuItem.name) return false

        // Check if customizations match
        const existingCustoms = existing.customizations?.map((c: any) => c.name).sort().join(',') || ''
        const itemCustoms = item.customizations?.map((c: any) => c.name).sort().join(',') || ''

        return existingCustoms === itemCustoms
      })

      if (existingIndex !== -1) {
        // Add quantity to existing item
        consolidated[existingIndex].quantity += item.quantity
      } else {
        // Add new item
        consolidated.push({ ...item })
      }
    })

    return consolidated
  }

  // Check for access denied error
  if (error && error.data?.code === 'UNAUTHORIZED') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">Brigado Burger - Kitchen Display</h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Logged in as: {session?.user?.name}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  signOut({ callbackUrl: '/auth/signin' })
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          <Card className="border-red-500">
            <CardContent className="flex h-96 flex-col items-center justify-center gap-4">
              <AlertCircle className="h-16 w-16 text-red-500" />
              <div className="text-center">
                <h2 className="mb-2 text-2xl font-bold text-red-500">Access Denied</h2>
                <p className="text-lg text-muted-foreground">
                  You don't have permission to access the Kitchen Display.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  This page is only accessible to Kitchen staff and Administrators.
                </p>
                <p className="mt-4 text-sm">
                  Current role: <span className="font-semibold">{session?.user?.role}</span>
                </p>
              </div>
              <Button
                onClick={() => {
                  signOut({ callbackUrl: '/auth/signin' })
                }}
              >
                Sign in with a different account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {session?.user?.role === 'ADMIN' && <AdminNav />}
      <div className="p-2 sm:p-4 md:p-6 w-full">
        <div className="w-full">
          <div className="mb-2 sm:mb-4 md:mb-6 flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Kitchen Display</h1>
            {session?.user?.role !== 'ADMIN' && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Logged in as: {session?.user?.name}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    signOut({ callbackUrl: '/auth/signin' })
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>

        <div className="mb-2 sm:mb-4 flex items-center justify-between rounded-lg bg-muted p-2 sm:p-3 md:p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <span className="font-medium">Active Orders: {orders?.length || 0}</span>
          </div>
          <Button
            onClick={handleRefresh}
            size="sm"
            variant="outline"
            className="hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all duration-150"
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {orders && orders.length === 0 ? (
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <CheckCircle className="mx-auto mb-2 h-12 w-12" />
                <p className="text-lg font-medium">All caught up!</p>
                <p className="text-sm">No pending orders at the moment</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-1.5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {orders?.map((order) => {
              // Consolidate items before displaying
              const consolidatedItems = consolidateOrderItems(order.items)

              // Check if any customization contains "cheese"
              const hasCheeseCustomization = consolidatedItems.some(item =>
                item.customizations?.some((c: any) => c.name.toLowerCase().includes('cheese'))
              )

              return (
                <Card
                  key={order.id}
                  className="border-red-500 bg-red-50 dark:bg-red-500 relative"
                >
                  {hasCheeseCustomization && (
                    <div
                      className="absolute top-0.5 left-1/2 transform -translate-x-1/2 bg-white rounded-md px-0.5 py-0.5 shadow-md z-10 cursor-help group"
                    >
                      <span className="text-base">❗</span>
                      <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                        Cheese customization, inform chef!
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                  <CardHeader className="p-2 pb-1">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Order #{order.orderNumber}</CardTitle>
                      <div className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold bg-red-200 text-red-800">
                        {order.status}
                      </div>
                    </div>
                  <CardDescription className={`flex items-center gap-1 text-[10px] ${
                    order.status === 'PENDING' || order.status === 'PREPARING' ? 'dark:text-white' : ''
                  }`}>
                    <Clock className="h-2.5 w-2.5" />
                    {formatTime(order.createdAt)}
                    {order.customerName && ` • ${order.customerName}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 pt-0">
                  <div className="space-y-1">
                    {consolidatedItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-md border bg-background p-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-xs">{item.menuItem.name}</span>
                          <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                            x{item.quantity}
                          </span>
                        </div>
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-0.5">
                            {item.customizations.map((custom: any, cidx: number) => (
                              <div
                                key={cidx}
                                className="rounded bg-muted px-1 py-0.5 text-[10px]"
                              >
                                {custom.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-1 p-1.5">
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-[10px] py-1 h-auto"
                    onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                    disabled={updateStatus.isPending}
                  >
                    Mark as Ready
                  </Button>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] py-1 h-auto"
                    onClick={() => handleMarkAllUpToHere(order.id)}
                    disabled={updateStatus.isPending}
                  >
                    Mark All Up To Here
                  </Button>
                </CardFooter>
              </Card>
              )
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  )
}
