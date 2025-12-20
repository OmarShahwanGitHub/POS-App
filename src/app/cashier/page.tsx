'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ShoppingCart, Plus, Minus, DollarSign, CreditCard, LogOut, ClipboardList } from 'lucide-react'
import { useRouter } from 'next/navigation'
import AdminNav from '@/components/AdminNav'

type CartItem = {
  id: string // Unique identifier for this cart entry
  menuItemId: string
  name: string
  price: number
  quantity: number
  customizations: { type: string; name: string; price?: number }[]
}

export default function CashierPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [selectedItem, setSelectedItem] = useState<string | null>(null)
  const [customText, setCustomText] = useState<{ [key: string]: string }>({})
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CARD' | null>('CARD')
  const [showCashInput, setShowCashInput] = useState(false)
  const [cashGiven, setCashGiven] = useState('')
  const processingOrderRef = useRef(false)

  const { data: menuItems, isLoading: menuLoading } = trpc.menu.getAll.useQuery()
  const createOrder = trpc.order.create.useMutation()
  const createTerminalCheckout = trpc.order.createTerminalCheckout.useMutation()
  const checkTerminalStatus = trpc.order.checkTerminalStatus.useQuery(
    { orderId: cart.length > 0 ? 'temp' : '' },
    { enabled: false, refetchInterval: false }
  )
  const [processingTerminalPayment, setProcessingTerminalPayment] = useState(false)
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null)

  const addToCart = (item: any) => {
    // Always create a new cart entry to allow different customizations
    setCart([
      ...cart,
      {
        id: `${item.id}-${Date.now()}-${Math.random()}`, // Unique ID for each cart entry
        menuItemId: item.id,
        name: item.name,
        price: item.price,
        quantity: 1,
        customizations: [],
      },
    ])
  }

  const removeFromCart = (cartItemId: string) => {
    const existingItem = cart.find((i) => i.id === cartItemId)
    if (existingItem && existingItem.quantity > 1) {
      setCart(
        cart.map((i) =>
          i.id === cartItemId ? { ...i, quantity: i.quantity - 1 } : i
        )
      )
    } else {
      setCart(cart.filter((i) => i.id !== cartItemId))
    }
  }

  const addCustomization = (cartItemId: string, customization: { type: string; name: string; price?: number }) => {
    setCart(
      cart.map((i) => {
        if (i.id === cartItemId) {
          // Check if customization already exists
          const existingIndex = i.customizations.findIndex(c => c.type === customization.type && c.name === customization.name)

          if (existingIndex !== -1) {
            // Remove if it exists (toggle off)
            return {
              ...i,
              customizations: i.customizations.filter((_, index) => index !== existingIndex)
            }
          } else {
            // Add if it doesn't exist
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

  const subtotal = cart.reduce((sum, item) => {
    const customizationTotal = item.customizations.reduce((cSum, c) => cSum + (c.price || 0), 0)
    return sum + (item.price + customizationTotal) * item.quantity
  }, 0)
  // Square charges 2.6% + $0.10 for card payments, $0 for cash
  const processingFee = selectedPaymentMethod === 'CARD' ? (subtotal * 0.026) + 0.10 : 0
  const total = subtotal + processingFee

  const handleCheckout = async (paymentMethod: 'CASH' | 'CARD') => {
    if (cart.length === 0 || processingOrderRef.current) return

    // Set the payment method immediately when button is clicked and lock processing
    processingOrderRef.current = true
    setSelectedPaymentMethod(paymentMethod)

    // For cash payments, show the cash input instead of proceeding immediately
    if (paymentMethod === 'CASH') {
      setShowCashInput(true)
      processingOrderRef.current = false
      return
    }

    // For card payments with Terminal API (Tap to Pay)
    try {
      setProcessingTerminalPayment(true)

      // Step 1: Create the order
      const order = await createOrder.mutateAsync({
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations.length > 0 ? item.customizations : undefined,
        })),
        paymentMethod: 'SQUARE',
        orderType: 'IN_STORE',
        customerName: customerName || undefined,
      })

      setCurrentOrderId(order.id)

      // Step 2: Create Terminal checkout and get deep link
      const result = await createTerminalCheckout.mutateAsync({
        orderId: order.id,
      })

      // Step 3: Open Square POS app via deep link
      window.location.href = result.deeplink

      // Note: User will be redirected to Square POS app
      // When they return, we'll check the order status
    } catch (error: any) {
      alert('Failed to initiate payment: ' + (error.message || 'Unknown error'))
      setProcessingTerminalPayment(false)
      processingOrderRef.current = false
      setSelectedPaymentMethod('CARD')
    }
  }

  const handleCompleteCashPayment = async (skipCalculation = false) => {
    // Play click sound
    playClickSound()

    // If cash amount is entered and valid, show change calculation
    const cashAmount = parseFloat(cashGiven)
    const hasValidCash = !isNaN(cashAmount) && cashAmount >= subtotal

    processingOrderRef.current = true

    try {
      await createOrder.mutateAsync({
        items: cart.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations.length > 0 ? item.customizations : undefined,
        })),
        paymentMethod: 'CASH',
        orderType: 'IN_STORE',
        customerName: customerName || undefined,
      })

      if (hasValidCash) {
        const change = cashAmount - subtotal
        alert(`Order created successfully!\n\nChange: $${change.toFixed(2)}`)
      } else {
        alert(`Order created successfully!`)
      }

      // Reset everything
      setCart([])
      setCustomerName('')
      setCashGiven('')
      setShowCashInput(false)
      setSelectedPaymentMethod('CARD')
      processingOrderRef.current = false
    } catch (error) {
      alert('Failed to create order')
      setSelectedPaymentMethod('CARD')
      processingOrderRef.current = false
    }
  }

  const handleCardPaymentComplete = () => {
    // Play click sound
    playClickSound()

    // Reset everything and start fresh
    setCart([])
    setCustomerName('')
    setProcessingTerminalPayment(false)
    setCurrentOrderId(null)
    setSelectedPaymentMethod('CARD')
    processingOrderRef.current = false

    alert('Order complete! Ready for next customer.')
  }

  // Click sound function
  const playClickSound = () => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
  }

  const getCustomizations = (cartItemId: string) => {
    const cartItem = cart.find((i) => i.id === cartItemId)
    if (!cartItem || !menuItems) return []

    const menuItem = menuItems.find((m) => m.id === cartItem.menuItemId)
    if (!menuItem || !menuItem.customizationTemplates) return []

    return menuItem.customizationTemplates
  }

  const addCustomText = (cartItemId: string) => {
    const text = customText[cartItemId]?.trim()
    if (text) {
      addCustomization(cartItemId, { type: 'custom', name: text })
      setCustomText({ ...customText, [cartItemId]: '' })
    }
  }


  return (
    <div className="min-h-screen bg-background">
      {session?.user?.role === 'ADMIN' && <AdminNav />}
      <div className="p-2 md:p-6">
        <div className="mx-auto max-w-full md:max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl md:text-3xl font-bold text-primary">Brigado Burger - Cashier</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/cashier/orders')}>
                <ClipboardList className="mr-2 h-4 w-4" />
                View Orders
              </Button>
              {session?.user?.role !== 'ADMIN' && (
                <>
                  <div className="text-sm text-muted-foreground">
                    Logged in as: {session?.user?.name}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </>
              )}
            </div>
          </div>

        <div className="flex flex-col gap-6 md:grid md:grid-cols-3">
          {/* Menu Items */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Menu</CardTitle>
                <CardDescription>Select items to add to order</CardDescription>
              </CardHeader>
              <CardContent>
                {menuLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading menu...</div>
                ) : !menuItems || menuItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No menu items available</div>
                ) : (
                  <div className="grid gap-4 grid-cols-2">
                    {menuItems.map((item) => (
                      <Card key={item.id} className="cursor-pointer hover:border-primary flex flex-col">
                        <CardHeader>
                          <CardTitle className="text-lg">{item.name}</CardTitle>
                          <CardDescription>${item.price.toFixed(2)}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow" />
                        <CardFooter className="pt-0">
                          <Button onClick={() => { playClickSound(); addToCart(item); }} className="w-full justify-center active:scale-95 transition-transform">
                            Add
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cart */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Current Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <label className="text-sm font-medium">Customer Name (Optional)</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="mt-1 w-full rounded-md border p-2"
                    placeholder="Walk-in customer"
                    suppressHydrationWarning
                  />
                </div>

                <div className="space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">No items in cart</p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="space-y-2 border-b pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ${item.price.toFixed(2)} x {item.quantity}
                            </div>
                            {item.customizations.length > 0 && (
                              <div className="text-xs text-muted-foreground">
                                {item.customizations.map((c) => c.price ? `${c.name} (+$${c.price.toFixed(2)})` : c.name).join(', ')}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => { playClickSound(); removeFromCart(item.id); }}
                              className="active:scale-95 transition-transform"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => { playClickSound(); setCart(cart.map((i) =>
                                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                              )); }}
                              className="active:scale-95 transition-transform"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {!menuLoading && item.id === selectedItem && getCustomizations(item.id).length > 0 && (
                          <div className="space-y-2">
                            <div className="text-xs font-medium">Customizations:</div>
                            <div className="grid grid-cols-2 gap-1">
                              {getCustomizations(item.id).map((custom: any) => {
                                const isSelected = item.customizations.some(
                                  c => c.type === custom.type && c.name === custom.name
                                )
                                return (
                                  <Button
                                    key={custom.id}
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    onClick={() => { playClickSound(); addCustomization(item.id, { type: custom.type, name: custom.name, price: custom.price }); }}
                                    className="text-xs active:scale-95 transition-transform"
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
                                  placeholder="e.g. less seasoning, don't smash..."
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => { playClickSound(); addCustomText(item.id); }}
                                  disabled={!customText[item.id]?.trim()}
                                  className="active:scale-95 transition-transform"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {!menuLoading && getCustomizations(item.id).length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              playClickSound();
                              setSelectedItem(selectedItem === item.id ? null : item.id);
                            }}
                            className="active:scale-95 transition-transform"
                          >
                            {selectedItem === item.id ? 'Hide' : 'Show'} Customizations
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground italic">
                      <span>Card Processing Fee (2.6% + $0.10):</span>
                      <span>${((subtotal * 0.026) + 0.10).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2">
                <Button
                  className="w-full active:scale-95 transition-transform"
                  onClick={() => { playClickSound(); handleCheckout('CASH'); }}
                  onMouseEnter={() => !processingOrderRef.current && setSelectedPaymentMethod('CASH')}
                  onMouseLeave={() => !processingOrderRef.current && setSelectedPaymentMethod('CARD')}
                  disabled={cart.length === 0 || createOrder.isPending}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pay with Cash
                </Button>

                {/* Cash Input Box */}
                {showCashInput && (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                    <div className="text-sm font-medium">Cash Payment</div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Total Due:</span>
                        <span className="font-bold">${subtotal.toFixed(2)}</span>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Cash Received:</label>
                        <input
                          type="number"
                          step="0.01"
                          value={cashGiven}
                          onChange={(e) => setCashGiven(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCompleteCashPayment()
                            }
                          }}
                          className="mt-1 w-full rounded-md border p-2"
                          placeholder="0.00"
                          autoFocus
                        />
                      </div>
                      {cashGiven && parseFloat(cashGiven) >= subtotal && (
                        <div className="flex justify-between text-sm font-bold text-green-600">
                          <span>Change:</span>
                          <span>${(parseFloat(cashGiven) - subtotal).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 active:scale-95 transition-transform"
                        onClick={() => handleCompleteCashPayment(false)}
                      >
                        Complete
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 active:scale-95 transition-transform"
                        onClick={() => {
                          playClickSound();
                          setShowCashInput(false);
                          setCashGiven('');
                          setSelectedPaymentMethod('CARD');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* Terminal Payment Status */}
                {processingTerminalPayment && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 active:scale-95 transition-transform"
                    onClick={handleCardPaymentComplete}
                  >
                    Paid ✓
                  </Button>
                )}

                <Button
                  className="w-full active:scale-95 transition-transform"
                  variant="outline"
                  onClick={() => { playClickSound(); handleCheckout('CARD'); }}
                  onMouseEnter={() => !processingOrderRef.current && setSelectedPaymentMethod('CARD')}
                  onMouseLeave={() => !processingOrderRef.current && setSelectedPaymentMethod('CARD')}
                  disabled={cart.length === 0 || createOrder.isPending || processingTerminalPayment}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {processingTerminalPayment ? 'Processing...' : 'Pay with Card (Tap to Pay)'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
