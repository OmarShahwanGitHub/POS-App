import { router, protectedProcedure, cashierProcedure, kitchenProcedure } from '../trpc'
import { z } from 'zod'
import { SquareClient, SquareEnvironment } from 'square'

// Initialize Square client based on environment
const isProduction = process.env.SQUARE_ENVIRONMENT === 'production'
const squareClient = new SquareClient({
  token: isProduction
    ? process.env.SQUARE_PROD_ACCESS_TOKEN || ''
    : process.env.SQUARE_SANDBOX_ACCESS_TOKEN || '',
  environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
})

const customizationSchema = z.object({
  type: z.string(),
  name: z.string(),
  price: z.number().default(0),
})

const orderItemSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().min(1),
  customizations: z.array(customizationSchema).optional(),
})

export const orderRouter = router({
  // Create a new order
  create: protectedProcedure
    .input(
      z.object({
        items: z.array(orderItemSchema),
        paymentMethod: z.enum(['CASH', 'CARD', 'SQUARE']),
        orderType: z.enum(['IN_STORE', 'ONLINE']),
        customerName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Calculate order totals
      const menuItems = await ctx.prisma.menuItem.findMany({
        where: {
          id: { in: input.items.map((item) => item.menuItemId) },
        },
      })

      let subtotal = 0
      const orderItems = input.items.map((item) => {
        const menuItem = menuItems.find((mi) => mi.id === item.menuItemId)!

        // Calculate customization total for this item
        const customizationTotal = item.customizations?.reduce((sum, c) => sum + (c.price || 0), 0) || 0

        // Item total includes base price + customizations, multiplied by quantity
        const itemTotal = (menuItem.price + customizationTotal) * item.quantity
        subtotal += itemTotal

        return {
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          price: menuItem.price,
          customizations: item.customizations
            ? {
                create: item.customizations.map((c) => ({
                  type: c.type,
                  name: c.name,
                  price: c.price || 0,
                })),
              }
            : undefined,
        }
      })

      // Calculate fees based on payment method
      // Square charges 2.6% + $0.10 for card payments
      const tax = input.paymentMethod === 'CARD' || input.paymentMethod === 'SQUARE'
        ? (subtotal * 0.026) + 0.10
        : 0
      const total = subtotal + tax

      // Get customer name from user account if not provided
      let customerName = input.customerName
      if (!customerName && ctx.session.user.id) {
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.session.user.id },
          select: { name: true },
        })
        customerName = user?.name || undefined
      }

      // Create the order
      const order = await ctx.prisma.order.create({
        data: {
          customerId: ctx.session.user.id,
          customerName,
          paymentMethod: input.paymentMethod,
          orderType: input.orderType,
          subtotal,
          tax,
          total,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: {
            include: {
              menuItem: true,
              customizations: true,
            },
          },
        },
      })

      return order
    }),

  // Process Square payment
  processSquarePayment: cashierProcedure
    .input(
      z.object({
        orderId: z.string(),
        sourceId: z.string(), // Payment token from Square
      })
    )
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      })

      if (!order) {
        throw new Error('Order not found')
      }

      try {
        const result = await squareClient.payments.create({
          sourceId: input.sourceId,
          amountMoney: {
            amount: BigInt(Math.round(order.total * 100)), // Convert to cents
            currency: 'USD',
          },
          idempotencyKey: order.id,
        })

        // Update order with payment ID
        await ctx.prisma.order.update({
          where: { id: input.orderId },
          data: {
            paymentId: result.payment?.id,
            status: 'PREPARING',
          },
        })

        return { success: true, payment: result.payment }
      } catch (error) {
        throw new Error('Payment failed')
      }
    }),

  // Get all orders (with filters)
  getAll: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']).optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.order.findMany({
        where: {
          status: input?.status,
        },
        include: {
          items: {
            include: {
              menuItem: true,
              customizations: true,
            },
          },
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: input?.limit,
      })
    }),

  // Get order by ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.order.findUnique({
        where: { id: input.id },
        include: {
          items: {
            include: {
              menuItem: true,
              customizations: true,
            },
          },
          customer: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })
    }),

  // Update order status (kitchen/cashier)
  updateStatus: kitchenProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(['PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.order.update({
        where: { id: input.id },
        data: {
          status: input.status,
          completedAt: input.status === 'COMPLETED' ? new Date() : undefined,
        },
      })
    }),

  // Get orders for kitchen display
  getKitchenOrders: kitchenProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING', 'PREPARING', 'READY'],
        },
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true,
              },
            },
            customizations: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 50, // Limit to 50 orders max
    })
  }),

  // Get user's order history
  getMyOrders: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.order.findMany({
      where: {
        customerId: ctx.session.user.id,
      },
      include: {
        items: {
          include: {
            menuItem: true,
            customizations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }),

  // Create Terminal checkout for Tap to Pay
  createTerminalCheckout: cashierProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      })

      if (!order) {
        throw new Error('Order not found')
      }

      // For now, we'll create a simple reference and use Square POS deep link
      // In production with a physical terminal, you'd use the Terminal API
      const checkoutId = `checkout-${order.id}-${Date.now()}`

      // Update order with terminal checkout ID
      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: {
          terminalCheckoutId: checkoutId,
        },
      })

      // Deep link to open Square POS app
      // Format: square-commerce-v1://payment/create?data={URL_ENCODED_JSON}
      // Note: You can just pass the total amount - no need to match individual items in Square
      const applicationId = isProduction
        ? process.env.SQUARE_PROD_APPLICATION_ID || ''
        : process.env.SQUARE_SANDBOX_APPLICATION_ID || ''
      
      if (!applicationId) {
        throw new Error(
          isProduction
            ? 'SQUARE_PROD_APPLICATION_ID is not configured. Please add it to your .env file.'
            : 'SQUARE_SANDBOX_APPLICATION_ID is not configured. Please add it to your .env file.'
        )
      }

      // Get base URL for callback
      // Square expects a callback URL to return to the app after payment
      // For web apps, we use the full web URL (no query params - Square doesn't allow them)
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const callbackUrl = `${baseUrl}/cashier`

      const amountInCents = Math.round(order.total * 100)
      const paymentData = {
        client_id: applicationId,
        amount: amountInCents,
        currency_code: 'USD',
        note: `Order ${order.orderNumber}`,
        client_transaction_id: checkoutId,
        callback_url: callbackUrl,
        // Also try ios_callback_url in case Square requires it for iOS devices
        ios_callback_url: callbackUrl,
      }
      // URL-encode the JSON string
      const encodedData = encodeURIComponent(JSON.stringify(paymentData))
      const deeplink = `square-commerce-v1://payment/create?data=${encodedData}`

      return {
        checkoutId,
        deeplink,
      }
    }),

  // Check Terminal checkout status
  // Note: Without actual Terminal API, we check if order has been updated with paymentId
  // In production with physical terminal, you'd poll the Terminal API
  checkTerminalStatus: cashierProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        select: { terminalCheckoutId: true, status: true, paymentId: true },
      })

      if (!order || !order.terminalCheckoutId) {
        return { status: 'NOT_FOUND' }
      }

      // Check if order has been paid (paymentId set or status changed)
      if (order.paymentId || order.status !== 'PENDING') {
        return { status: 'COMPLETED', paymentId: order.paymentId }
      }

      // Still waiting for payment
      return { status: 'PENDING' }
    }),

  // TEMPORARY: Simulate payment completion for testing
  // Remove this in production when you have actual Square POS integration
  simulatePaymentComplete: cashierProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
      })

      if (!order) {
        throw new Error('Order not found')
      }

      // Simulate successful payment
      await ctx.prisma.order.update({
        where: { id: input.orderId },
        data: {
          paymentId: `simulated-payment-${Date.now()}`,
          status: 'PREPARING',
        },
      })

      return { success: true }
    }),
})
