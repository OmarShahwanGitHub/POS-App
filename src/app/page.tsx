'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (!session) {
      router.push('/auth/signin')
      return
    }

    // Route based on user role
    switch (session.user.role) {
      case 'CASHIER':
        router.push('/cashier')
        break
      case 'KITCHEN':
        router.push('/kitchen')
        break
      case 'CUSTOMER':
        router.push('/order')
        break
      case 'ADMIN':
      case 'SUPERADMIN':
        router.push('/admin')
        break
      default:
        router.push('/auth/signin')
    }
  }, [session, status, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">Brigado Burger</h1>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
