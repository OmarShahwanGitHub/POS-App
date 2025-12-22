import { router } from '../trpc'
import { menuRouter } from './menu'
import { orderRouter } from './order'
import { userRouter } from './user'
import type { inferRouterOutputs } from '@trpc/server'

export const appRouter = router({
  menu: menuRouter,
  order: orderRouter,
  user: userRouter,
})

export type AppRouter = typeof appRouter
export type RouterOutputs = inferRouterOutputs<AppRouter>
