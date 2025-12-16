import { initTRPC, TRPCError } from '@trpc/server'
import { type FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const createTRPCContext = async (opts: FetchCreateContextFnOptions) => {
  const session = await getServerSession(authOptions)

  return {
    session,
    prisma,
    req: opts.req,
    resHeaders: opts.resHeaders,
  }
}

const t = initTRPC.context<typeof createTRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure

// Middleware for authenticated users
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.session.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  })
})

// Middleware for role-based access
const hasRole = (roles: string[]) =>
  t.middleware(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }
    if (!roles.includes(ctx.session.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }
    return next({
      ctx: {
        session: { ...ctx.session, user: ctx.session.user },
      },
    })
  })

export const protectedProcedure = t.procedure.use(isAuthed)
export const cashierProcedure = t.procedure.use(hasRole(['CASHIER', 'ADMIN']))
export const kitchenProcedure = t.procedure.use(hasRole(['KITCHEN', 'ADMIN']))
export const adminProcedure = t.procedure.use(hasRole(['ADMIN']))
