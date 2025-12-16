'use client'

import { useSession, signOut } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function OrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { data: orders, refetch } = trpc.order.getAll.useQuery()
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => refetch(),
  })

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      await updateStatus.mutateAsync({ id: orderId, status: 'CANCELLED' })
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/cashier')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cashier
            </Button>
            <h1 className="text-3xl font-bold text-primary">Order Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Logged in as: {session?.user?.name}
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {orders && orders.length === 0 ? (
            <Card>
              <CardContent className="flex h-64 items-center justify-center">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            orders?.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Order #{order.orderNumber}</CardTitle>
                      <CardDescription>
                        {formatTime(order.createdAt)}
                        {order.customerName && ` • ${order.customerName}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          order.status === 'PENDING'
                            ? 'bg-orange-200 text-orange-800'
                            : order.status === 'PREPARING'
                            ? 'bg-blue-200 text-blue-800'
                            : order.status === 'READY'
                            ? 'bg-green-200 text-green-800'
                            : order.status === 'COMPLETED'
                            ? 'bg-gray-200 text-gray-800'
                            : 'bg-red-200 text-red-800'
                        }`}
                      >
                        {order.status}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b pb-2">
                        <div>
                          <div className="font-medium">{item.menuItem.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                          </div>
                          {item.customizations && item.customizations.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              {item.customizations.map((c) => c.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-1 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${order.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>${order.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${order.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Payment:</span>
                      <span>{order.paymentMethod}</span>
                    </div>
                  </div>
                  {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                    <div className="mt-4">
                      <Button
                        variant="destructive"
                        onClick={() => handleCancelOrder(order.id)}
                        disabled={updateStatus.isPending}
                      >
                        Cancel Order
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
