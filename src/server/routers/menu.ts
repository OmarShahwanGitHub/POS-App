import { router, publicProcedure, adminProcedure } from '../trpc'
import { z } from 'zod'

export const menuRouter = router({
  // Get all menu items
  getAll: publicProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.menuItem.findMany({
      where: {
        available: true,
      },
      orderBy: {
        category: 'asc',
      },
      include: {
        customizationTemplates: true,
      },
    })
  }),

  // Get menu item by ID
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.menuItem.findUnique({
        where: { id: input.id },
      })
    }),

  // Create menu item (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        category: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.menuItem.create({
        data: input,
      })
    }),

  // Update menu item (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        category: z.string().optional(),
        available: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return await ctx.prisma.menuItem.update({
        where: { id },
        data,
      })
    }),

  // Delete menu item (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.menuItem.delete({
        where: { id: input.id },
      })
    }),

  // Customization Template procedures
  // Get customizations for a menu item
  getCustomizations: publicProcedure
    .input(z.object({ menuItemId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.customizationTemplate.findMany({
        where: { menuItemId: input.menuItemId },
        orderBy: { createdAt: 'asc' },
      })
    }),

  // Add customization template (admin only)
  addCustomization: adminProcedure
    .input(
      z.object({
        menuItemId: z.string(),
        type: z.string(),
        name: z.string(),
        price: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.customizationTemplate.create({
        data: input,
      })
    }),

  // Update customization template (admin only)
  updateCustomization: adminProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.string().optional(),
        name: z.string().optional(),
        price: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input
      return await ctx.prisma.customizationTemplate.update({
        where: { id },
        data,
      })
    }),

  // Delete customization template (admin only)
  deleteCustomization: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.customizationTemplate.delete({
        where: { id: input.id },
      })
    }),
})
