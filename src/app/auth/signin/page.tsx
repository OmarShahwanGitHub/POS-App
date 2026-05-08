'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-100 to-orange-200 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-primary">Brigado Burger</CardTitle>
          <CardDescription>Sign in to access the POS system</CardDescription>
        </CardHeader>
        <div className="px-6 pb-2">
          <div
            className="rounded-lg border border-orange-200/80 bg-orange-50/90 p-4 text-sm shadow-sm"
            role="region"
            aria-label="Demo login credentials"
          >
            <p className="mb-3 text-center font-semibold text-orange-950">Demo login</p>
            <ul className="space-y-3 text-left font-mono text-xs text-orange-950/90">
              <li>
                <span className="font-sans text-[11px] font-medium text-muted-foreground">Cashier</span>
                <div>cashier@brigado.com</div>
                <div>password123</div>
              </li>
              <li>
                <span className="font-sans text-[11px] font-medium text-muted-foreground">Kitchen</span>
                <div>kitchen@brigado.com</div>
                <div>password123</div>
              </li>
            </ul>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border p-2"
                placeholder="user@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border p-2"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-primary underline">
                Register
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
