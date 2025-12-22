'use client'

import { useSession, signOut } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LogOut, ArrowLeft, Edit, Plus, Minus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type CartItem = {
  id: string
  menuItemId: string
  name: string
  price: number
  quantity: number
  customizations: { type: string; name: string; price?: number }[]
}

export default function OrdersPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { data: orders, refetch } = trpc.order.getAll.useQuery()
  const { data: orderHistory } = trpc.order.getOrderHistory.useQuery()
  const { data: menuItems } = trpc.menu.getAll.useQuery()
  const updateStatus = trpc.order.updateStatus.useMutation({
    onSuccess: () => refetch(),
  })
  const editOrder = trpc.order.editOrder.useMutation({
    onSuccess: () => {
      refetch()
      setEditingOrderId(null)
    },
  })
  const updateOrderNumber = trpc.order.updateOrderNumber.useMutation({
    onSuccess: () => refetch(),
  })

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)
  const [editCart, setEditCart] = useState<CartItem[]>([])
  const [editCustomerName, setEditCustomerName] = useState('')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [customText, setCustomText] = useState<{ [key: string]: string }>({})
  const [editingOrderNumber, setEditingOrderNumber] = useState<string | null>(null)
  const [newOrderNumber, setNewOrderNumber] = useState<number>(0)

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString()
  }

  const handleCancelOrder = async (orderId: string) => {
    if (confirm('Are you sure you want to cancel this order?')) {
      await updateStatus.mutateAsync({ id: orderId, status: 'CANCELLED' })
    }
  }

  const handleStartEdit = (order: any) => {
    setEditingOrderId(order.id)
    setEditCustomerName(order.customerName || '')

    // Convert order items to cart items
    const cartItems: CartItem[] = order.items.map((item: any, index: number) => ({
      id: `${item.id}-${index}`,
      menuItemId: item.menuItemId,
      name: item.menuItem.name,
      price: item.price,
      quantity: item.quantity,
      customizations: item.customizations.map((c: any) => ({
        type: c.type,
        name: c.name,
        price: c.price,
      })),
    }))
    setEditCart(cartItems)
  }

  const handleSaveEdit = async (orderId: string) => {
    if (editCart.length === 0) {
      alert('Order must have at least one item')
      return
    }

    try {
      await editOrder.mutateAsync({
        orderId,
        items: editCart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations.length > 0 ? item.customizations : undefined,
        })),
        customerName: editCustomerName || undefined,
      })

      // Get the order number for the notification
      const order = orders?.find(o => o.id === orderId)
      if (order) {
        alert(`Order #${order.orderNumber} edited successfully! Kitchen has been notified.`)
      }
    } catch (error) {
      alert('Failed to save order changes')
    }
  }

  const handleCancelEdit = () => {
    setEditingOrderId(null)
    setEditCart([])
    setEditCustomerName('')
    setSelectedItem(null)
  }

  const addToCart = (item: any) => {
    setEditCart([
      ...editCart,
      {
        id: `${item.id}-${Date.now()}-${Math.random()}`,
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        customizations: [],
      },
    ])
  }

  const removeFromCart = (cartItemId: string) => {
    const existingItem = editCart.find((i) => i.id === cartItemId)
    if (existingItem && existingItem.quantity > 1) {
      setEditCart(
        editCart.map((i) =>
          i.id === cartItemId ? { ...i, quantity: i.quantity - 1 } : i
        )
      )
    } else {
      setEditCart(editCart.filter((i) => i.id !== cartItemId))
    }
  }

  const addCustomization = (cartItemId: string, customization: { type: string; name: string; price?: number }) => {
    setEditCart(
      editCart.map((i) => {
        if (i.id === cartItemId) {
          const existingIndex = i.customizations.findIndex(c => c.type === customization.type && c.name === customization.name)
          if (existingIndex !== -1) {
            return {
              ...i,
              customizations: i.customizations.filter((_, index) => index !== existingIndex)
            }
          } else {
            return {
              ...i,
              customizations: [...i.customizations, customization]
            }
          }
        }
        return i
      })
    )
  }

  const getCustomizations = (cartItemId: string) => {
    const cartItem = editCart.find((i) => i.id === cartItemId)
    if (!cartItem || !menuItems) return []

    const menuItem = menuItems.find((m) => m.id === cartItem.menuItemId)
    if (!menuItem || !(menuItem as any).customizationTemplates) return []

    return (menuItem as any).customizationTemplates
  }

  const addCustomText = (cartItemId: string) => {
    const text = customText[cartItemId]?.trim()
    if (text) {
      addCustomization(cartItemId, { type: 'custom', name: text })
      setCustomText({ ...customText, [cartItemId]: '' })
    }
  }

  const handleStartOrderNumberEdit = (order: any) => {
    setEditingOrderNumber(order.id)
    setNewOrderNumber(order.orderNumber)
  }

  const handleSaveOrderNumber = async (orderId: string, oldOrderNumber: number) => {
    if (newOrderNumber === oldOrderNumber) {
      setEditingOrderNumber(null)
      return
    }

    const adjustSubsequent = confirm(
      `Change order #${oldOrderNumber} to #${newOrderNumber}.\n\nDo you want to adjust all subsequent orders as well?\n\n` +
      `YES: Orders after #${oldOrderNumber} will be shifted\n` +
      `NO: Only this order number will change`
    )

    try {
      await updateOrderNumber.mutateAsync({
        orderId,
        newOrderNumber,
        adjustSubsequent,
      })
      alert(`Order number updated successfully!`)
      setEditingOrderNumber(null)
    } catch (error) {
      alert('Failed to update order number')
    }
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-4 md:mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/cashier')} className="active:scale-95 transition-transform">
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Back to Cashier</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">Order Management</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <div className="text-xs sm:text-sm text-muted-foreground">
              <span className="hidden sm:inline">Logged in as: </span>
              {session?.user?.name}
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="active:scale-95 transition-transform">
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Current Orders Section */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Orders</h2>
          <div className="grid gap-4">
            {orders && orders.length === 0 ? (
              <Card>
                <CardContent className="flex h-32 items-center justify-center">
                  <p className="text-muted-foreground">No current orders</p>
                </CardContent>
              </Card>
            ) : (
              orders?.map((order) => (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 min-w-0">
                      {editingOrderNumber === order.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">Order #</span>
                          <input
                            type="number"
                            value={newOrderNumber}
                            onChange={(e) => setNewOrderNumber(parseInt(e.target.value) || 0)}
                            className="w-20 rounded border px-2 py-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleSaveOrderNumber(order.id, order.orderNumber)}
                            className="active:scale-95 transition-transform"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingOrderNumber(null)}
                            className="active:scale-95 transition-transform"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <CardTitle className="text-lg sm:text-xl">Order #{order.orderNumber}</CardTitle>
                          {editingOrderId !== order.id && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartOrderNumberEdit(order)}
                              className="h-6 px-2 active:scale-95 transition-transform"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                      <CardDescription className="text-xs sm:text-sm break-words">
                        {formatTime(order.createdAt)}
                        {order.customerName && ` • ${order.customerName}`}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div
                        className={`rounded-full px-2 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap ${
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
                  {editingOrderId === order.id ? (
                    <div className="space-y-4">
                      {/* Edit Mode */}
                      <div className="mb-4">
                        <label className="text-sm font-medium">Customer Name</label>
                        <input
                          type="text"
                          value={editCustomerName}
                          onChange={(e) => setEditCustomerName(e.target.value)}
                          className="mt-1 w-full rounded-md border p-2"
                          placeholder="Walk-in customer"
                        />
                      </div>

                      {/* Cart Items */}
                      <div className="space-y-3">
                        <h3 className="font-semibold">Order Items</h3>
                        {editCart.map((item) => (
                          <div key={item.id} className="space-y-2 border rounded p-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium break-words">{item.name}</div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  ${item.price.toFixed(2)} x {item.quantity}
                                </div>
                                {item.customizations.length > 0 && (
                                  <div className="text-xs text-muted-foreground break-words">
                                    {item.customizations.map((c) => c.price ? `${c.name} (+$${c.price.toFixed(2)})` : c.name).join(', ')}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => removeFromCart(item.id)}
                                  className="active:scale-95 transition-transform h-8 w-8"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="w-8 text-center text-sm">{item.quantity}</span>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => setEditCart(editCart.map((i) =>
                                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                                  ))}
                                  className="active:scale-95 transition-transform h-8 w-8"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => setEditCart(editCart.filter(i => i.id !== item.id))}
                                  className="active:scale-95 transition-transform h-8 w-8"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {selectedItem === item.id && getCustomizations(item.id).length > 0 && (
                              <div className="space-y-2">
                                <div className="text-xs font-medium">Customizations:</div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {getCustomizations(item.id).map((custom: any) => {
                                    const isSelected = item.customizations.some(
                                      c => c.type === custom.type && c.name === custom.name
                                    )
                                    return (
                                      <Button
                                        key={custom.id}
                                        size="sm"
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => addCustomization(item.id, { type: custom.type, name: custom.name, price: custom.price })}
                                        className="text-xs active:scale-95 transition-transform break-words whitespace-normal h-auto py-2"
                                      >
                                        {custom.name}{custom.price > 0 && ` (+$${custom.price.toFixed(2)})`}
                                      </Button>
                                    )
                                  })}
                                </div>
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs font-medium">Custom Note:</div>
                                  <div className="flex gap-1">
                                    <input
                                      type="text"
                                      value={customText[item.id] || ''}
                                      onChange={(e) =>
                                        setCustomText({ ...customText, [item.id]: e.target.value })
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          addCustomText(item.id)
                                        }
                                      }}
                                      className="flex-1 rounded-md border px-2 py-1 text-xs"
                                      placeholder="e.g. less seasoning..."
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => addCustomText(item.id)}
                                      disabled={!customText[item.id]?.trim()}
                                      className="active:scale-95 transition-transform"
                                    >
                                      Add
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {getCustomizations(item.id).length > 0 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setSelectedItem(selectedItem === item.id ? null : item.id)
                                }
                                className="active:scale-95 transition-transform"
                              >
                                {selectedItem === item.id ? 'Hide' : 'Show'} Customizations
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Items */}
                      <div className="space-y-2">
                        <h3 className="font-semibold">Add Items</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {menuItems?.map((item) => (
                            <Button
                              key={item.id}
                              variant="outline"
                              onClick={() => addToCart(item)}
                              className="justify-start active:scale-95 transition-transform text-left break-words whitespace-normal h-auto py-2"
                            >
                              <Plus className="mr-2 h-4 w-4 flex-shrink-0" />
                              <span className="break-words">{item.name} (${item.price.toFixed(2)})</span>
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                        <Button
                          onClick={() => handleSaveEdit(order.id)}
                          disabled={editOrder.isPending || editCart.length === 0}
                          className="active:scale-95 transition-transform flex-1 sm:flex-initial"
                        >
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          className="active:scale-95 transition-transform flex-1 sm:flex-initial"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* View Mode */}
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium break-words">{item.menuItem.name}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground">
                                ${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                              </div>
                              {item.customizations && item.customizations.length > 0 && (
                                <div className="text-xs text-muted-foreground break-words">
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
                      <div className="mt-4 flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          onClick={() => handleStartEdit(order)}
                          className="active:scale-95 transition-transform flex-1 sm:flex-initial"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Order
                        </Button>
                        {(order.status === 'PENDING' || order.status === 'PREPARING') && (
                          <Button
                            variant="destructive"
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={updateStatus.isPending}
                            className="active:scale-95 transition-transform flex-1 sm:flex-initial"
                          >
                            Cancel Order
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ))
            )}
          </div>
        </div>

        {/* Archived Orders Section */}
        {orderHistory && orderHistory.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              Archived Orders
              <span className="text-sm font-normal text-muted-foreground">
                ({orderHistory.length} orders)
              </span>
            </h2>
            <div className="grid gap-4">
              {orderHistory.map((order) => (
                <Card key={order.id} className="opacity-75">
                  <CardHeader>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex flex-wrap items-center gap-2 text-lg sm:text-xl">
                          Order #{order.orderNumber}
                          <span className="text-xs font-normal px-2 py-1 rounded bg-gray-200 text-gray-700 whitespace-nowrap">
                            ARCHIVED
                          </span>
                        </CardTitle>
                        <CardDescription className="text-xs sm:text-sm break-words">
                          {formatTime(order.createdAt)}
                          {order.customerName && ` • ${order.customerName}`}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div
                          className={`rounded-full px-2 sm:px-3 py-1 text-xs font-semibold whitespace-nowrap ${
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
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium break-words">{item.menuItemName}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} x {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
                            </div>
                            {item.customizations && item.customizations.length > 0 && (
                              <div className="text-xs text-muted-foreground break-words">
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
