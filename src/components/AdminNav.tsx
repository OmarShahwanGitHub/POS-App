'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LogOut, LayoutDashboard, Users, ChefHat, History } from 'lucide-react'

export default function AdminNav() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="border-b bg-background">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={pathname === '/admin' ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/admin')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dash</span>
            </Button>
            <Button
              variant={pathname === '/admin/history' ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/admin/history')}
            >
              <History className="mr-2 h-4 w-4" />
              History
            </Button>
            {session?.user?.role === 'SUPERADMIN' && (
              <Button
                variant={pathname === '/admin/users' ? 'default' : 'outline'}
                size="sm"
                onClick={() => router.push('/admin/users')}
              >
                <Users className="mr-2 h-4 w-4" />
                Users
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={pathname === '/cashier' ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/cashier')}
            >
              <Users className="mr-2 h-4 w-4" />
              Cashier
            </Button>
            <Button
              variant={pathname === '/kitchen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => router.push('/kitchen')}
            >
              <ChefHat className="mr-2 h-4 w-4" />
              Kitchen
            </Button>
            <div className="hidden text-sm text-muted-foreground md:block">
              Logged in as: {session?.user?.name}
            </div>
            <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/auth/signin' })}>
              <LogOut className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
