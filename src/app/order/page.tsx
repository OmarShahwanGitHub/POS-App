'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, Plus, Minus, CreditCard } from 'lucide-react'

type CartItem = {
  menuItemId: string
  name: string
  price: number
  quantity: number
  customizations: { type: string; name: string }[]
}

export default function OrderPage() {
  const { data: session } = useSession()
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedItem, setSelectedItem] = useState<string | null>(null)

  const { data: menuItems } = trpc.menu.getAll.useQuery()
  const { data: myOrders, refetch: refetchOrders } = trpc.order.getMyOrders.useQuery()
  const createOrder = trpc.order.create.useMutation({
    onSuccess: (order) => {
      setCart([])
      refetchOrders()
      alert(`Order #${order.orderNumber} placed successfully! You will be notified when it's ready.`)
    },
  })

  const addToCart = (item: any) => {
    const existingItem = cart.find((i) => i.menuItemId === item.id)
    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      )
    } else {
      setCart([
        ...cart,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          customizations: [],
        },
      ])
    }
  }

  const removeFromCart = (menuItemId: string) => {
    const existingItem = cart.find((i) => i.menuItemId === menuItemId)
    if (existingItem && existingItem.quantity > 1) {
      setCart(
        cart.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
        )
      )
    } else {
      setCart(cart.filter((i) => i.menuItemId !== menuItemId))
    }
  }

  const addCustomization = (menuItemId: string, customization: { type: string; name: string }) => {
    setCart(
      cart.map((i) =>
        i.menuItemId === menuItemId
          ? { ...i, customizations: [...i.customizations, customization] }
          : i
      )
    )
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = subtotal * 0.075
  const total = subtotal + tax

  const handleCheckout = async () => {
    if (cart.length === 0) return

    try {
      await createOrder.mutateAsync({
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations.length > 0 ? item.customizations : undefined,
        })),
        paymentMethod: 'CARD',
        orderType: 'ONLINE',
      })
    } catch (error) {
      alert('Failed to create order')
    }
  }

  const availableCustomizations = [
    { type: 'remove_cheese', name: 'No Cheese' },
    { type: 'remove_pickles', name: 'No Pickles' },
    { type: 'remove_onions', name: 'No Caramelized Onions' },
    { type: 'remove_sauce', name: 'No Brigado Sauce' },
  ]

  const burgers = menuItems?.filter((item) => item.category === 'BURGER')
  const drinks = menuItems?.filter((item) => item.category === 'DRINK')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Brigado Burger</h1>
            <div className="text-sm">Welcome, {session?.user?.name}!</div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Menu */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <h2 className="mb-4 text-2xl font-bold">Our Burgers</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {burgers?.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription className="text-lg font-semibold text-primary">
                        ${item.price.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        American cheese, pickles, caramelized onions, Brigado burger sauce
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button onClick={() => addToCart(item)} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="mb-4 text-2xl font-bold">Drinks</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {drinks?.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <CardTitle>{item.name}</CardTitle>
                      <CardDescription className="text-lg font-semibold text-primary">
                        ${item.price.toFixed(2)}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <Button onClick={() => addToCart(item)} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add to Cart
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Your Cart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">Your cart is empty</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.menuItemId} className="space-y-2 border-b pb-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} each
                            </div>
                            {item.customizations.length > 0 && (
                              <div className="mt-1 text-xs text-muted-foreground">
                                {item.customizations.map((c) => c.name).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => removeFromCart(item.menuItemId)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-8 w-8"
                              onClick={() => addToCart({ id: item.menuItemId, name: item.name, price: item.price })}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {item.name.includes('Burger') && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full"
                              onClick={() =>
                                setSelectedItem(selectedItem === item.menuItemId ? null : item.menuItemId)
                              }
                            >
                              {selectedItem === item.menuItemId ? 'Hide' : 'Customize'}
                            </Button>

                            {item.menuItemId === selectedItem && (
                              <div className="space-y-2 rounded-md bg-muted p-3">
                                <div className="text-xs font-medium">Remove toppings:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {availableCustomizations.map((custom) => (
                                    <Button
                                      key={custom.type}
                                      size="sm"
                                      variant="outline"
                                      className="h-auto whitespace-normal py-2 text-xs"
                                      onClick={() => addCustomization(item.menuItemId, custom)}
                                    >
                                      {custom.name}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Tax (7.5%):</span>
                      <span>${tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || createOrder.isPending}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Place Order
                </Button>
              </CardFooter>
            </Card>

            {/* Order History */}
            {myOrders && myOrders.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {myOrders.slice(0, 3).map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <div className="font-medium">Order #{order.orderNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.items.length} items • ${order.total.toFixed(2)}
                          </div>
                        </div>
                        <div
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            order.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'READY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {order.status}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
