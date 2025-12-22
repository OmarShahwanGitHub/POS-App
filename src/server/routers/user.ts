import { router, publicProcedure, adminProcedure, superAdminProcedure } from '../trpc'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

export const userRouter = router({
  // Register new user (public - sets role to USER by default)
  register: publicProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        throw new Error('User already exists')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10)

      // Create user with USER role (no access until admin approves)
      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: 'USER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })

      return user
    }),

  // Create user (superadmin only)
  create: superAdminProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(['USER', 'CUSTOMER', 'CASHIER', 'KITCHEN', 'ADMIN', 'SUPERADMIN']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already exists
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      })

      if (existingUser) {
        throw new Error('User already exists')
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(input.password, 10)

      // Create user
      const user = await ctx.prisma.user.create({
        data: {
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: input.role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      return user
    }),

  // Get current user
  getMe: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      return null
    }

    return await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })
  }),

  // Get all users (superadmin only)
  getAll: superAdminProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }),

  // Update user role (superadmin only)
  updateRole: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['USER', 'CUSTOMER', 'CASHIER', 'KITCHEN', 'ADMIN', 'SUPERADMIN']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      })
    }),

  // Update user (superadmin only - can update name, email, password, role)
  update: superAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        password: z.string().min(6).optional(),
        role: z.enum(['USER', 'CUSTOMER', 'CASHIER', 'KITCHEN', 'ADMIN', 'SUPERADMIN']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, password, ...updateData } = input
      
      const data: any = { ...updateData }
      
      // Hash password if provided
      if (password) {
        data.password = await bcrypt.hash(password, 10)
      }

      return await ctx.prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })
    }),

  // Delete user (superadmin only)
  delete: superAdminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent deleting yourself
      if (ctx.session.user.id === input.userId) {
        throw new Error('Cannot delete your own account')
      }

      await ctx.prisma.user.delete({
        where: { id: input.userId },
      })

      return { success: true }
    }),
})
