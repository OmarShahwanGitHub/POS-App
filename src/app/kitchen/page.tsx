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
  const { data: orders, refetch, error } = trpc.order.getKitchenOrders.useQuery(undefined, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds instead of 10
    staleTime: 10000, // Consider data fresh for 10 seconds
    retry: false, // Don't retry on auth errors
  })
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => refetch(),
  })

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
    <div className="min-h-screen bg-background">
      {session?.user?.role === 'ADMIN' && <AdminNav />}
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-3xl font-bold text-primary">Brigado Burger - Kitchen Display</h1>
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

        <div className="mb-4 flex items-center justify-between rounded-lg bg-muted p-4">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {orders?.map((order) => {
              // Check if any customization contains "cheese"
              const hasCheeseCustomization = order.items.some(item =>
                item.customizations?.some(c => c.name.toLowerCase().includes('cheese'))
              )

              return (
                <Card
                  key={order.id}
                  className="border-red-500 bg-red-50 dark:bg-red-500 relative"
                >
                  {hasCheeseCustomization && (
                    <div
                      className="absolute top-2 left-1/2 transform -translate-x-1/2 bg-white rounded-md px-2 py-1 shadow-md z-10 cursor-help group"
                    >
                      <span className="text-3xl">❗</span>
                      <div className="absolute hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-2 whitespace-nowrap">
                        Cheese customization, inform chef!
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl">Order #{order.orderNumber}</CardTitle>
                      <div className="rounded-full px-3 py-1 text-xs font-semibold bg-red-200 text-red-800">
                        {order.status}
                      </div>
                    </div>
                  <CardDescription className={`flex items-center gap-1 ${
                    order.status === 'PENDING' || order.status === 'PREPARING' ? 'dark:text-white' : ''
                  }`}>
                    <Clock className="h-3 w-3" />
                    {formatTime(order.createdAt)}
                    {order.customerName && ` • ${order.customerName}`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border bg-background p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{item.menuItem.name}</span>
                          <span className="rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                            x{item.quantity}
                          </span>
                        </div>
                        {item.customizations && item.customizations.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Customizations:
                            </div>
                            {item.customizations.map((custom) => (
                              <div
                                key={custom.id}
                                className="rounded bg-muted px-2 py-1 text-xs"
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
                <CardFooter className="flex gap-2">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusUpdate(order.id, 'COMPLETED')}
                    disabled={updateStatus.isPending}
                  >
                    Mark as Ready
                  </Button>
                  <Button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
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
