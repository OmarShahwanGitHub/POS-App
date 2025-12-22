'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function UsersPage() {
  const { data: session } = useSession()
  const { data: users, refetch, error } = trpc.user.getAll.useQuery()
  
  // All hooks must be called before any conditional returns
  const createUser = trpc.user.create.useMutation({ onSuccess: () => refetch() })
  const updateUser = trpc.user.update.useMutation({ onSuccess: () => refetch() })
  const updateRole = trpc.user.updateRole.useMutation({ onSuccess: () => refetch() })
  const deleteUser = trpc.user.delete.useMutation({ onSuccess: () => refetch() })

  const [isCreating, setIsCreating] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER' as 'USER' | 'CUSTOMER' | 'CASHIER' | 'KITCHEN' | 'ADMIN' | 'SUPERADMIN',
  })

  // Show error or loading state
  if (session?.user?.role !== 'SUPERADMIN') {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl">
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <AlertCircle className="mx-auto mb-2 h-12 w-12" />
                <p className="text-lg font-medium">Access Denied</p>
                <p className="text-sm">This page is only accessible to Super Administrators.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createUser.mutateAsync(formData)
      setIsCreating(false)
      setFormData({ name: '', email: '', password: '', role: 'USER' })
      setShowCreatePassword(false)
    } catch (error: any) {
      alert(error.message || 'Failed to create user')
    }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUserId) return
    
    try {
      const updateData: {
        userId: string
        name?: string
        email?: string
        password?: string
        role?: 'USER' | 'CUSTOMER' | 'CASHIER' | 'KITCHEN' | 'ADMIN' | 'SUPERADMIN'
      } = {
        userId: editingUserId,
        name: formData.name,
        email: formData.email,
        role: formData.role,
      }
      
      // Only include password if it's provided
      if (formData.password && formData.password.trim() !== '') {
        updateData.password = formData.password
      }
      
      const result = await updateUser.mutateAsync(updateData)
      
      // Show success message
      const message = formData.password && formData.password.trim() !== ''
        ? `User updated successfully! Email: ${result.email}. Password has been changed.`
        : `User updated successfully! Email: ${result.email}.`
      
      alert(message)
      
      setEditingUserId(null)
      setFormData({ name: '', email: '', password: '', role: 'USER' })
      setShowEditPassword(false)
      
      // Refetch users to ensure UI is up to date
      refetch()
    } catch (error: any) {
      console.error('Update user error:', error)
      alert(`Failed to update user: ${error.message || 'Unknown error'}`)
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      await deleteUser.mutateAsync({ userId })
    } catch (error: any) {
      alert(error.message || 'Failed to delete user')
    }
  }

  const handleQuickRoleUpdate = async (userId: string, newRole: 'USER' | 'CUSTOMER' | 'CASHIER' | 'KITCHEN' | 'ADMIN' | 'SUPERADMIN') => {
    try {
      await updateRole.mutateAsync({ userId, role: newRole })
    } catch (error: any) {
      alert(error.message || 'Failed to update role')
    }
  }

  const startEdit = (user: any) => {
    setEditingUserId(user.id)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role,
    })
    setShowEditPassword(false)
  }

  const cancelEdit = () => {
    setEditingUserId(null)
    setFormData({ name: '', email: '', password: '', role: 'USER' })
    setShowEditPassword(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'CASHIER':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'KITCHEN':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'CUSTOMER':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'USER':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">User Management</h1>
              <p className="text-muted-foreground">Manage users, roles, and permissions</p>
            </div>
            <Button onClick={() => setIsCreating(true)} className="active:scale-95 transition-transform">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>

          {/* Create User Form */}
          {isCreating && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Create New User</CardTitle>
                <CardDescription>Add a new user with email, password, and role</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 w-full rounded-md border p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 w-full rounded-md border p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Password</label>
                      <div className="relative">
                        <input
                          type={showCreatePassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="mt-1 w-full rounded-md border p-2 pr-10"
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCreatePassword(!showCreatePassword)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                          tabIndex={-1}
                        >
                          {showCreatePassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Role</label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                        className="mt-1 w-full rounded-md border p-2"
                        required
                      >
                        <option value="USER">USER (No Access)</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="CASHIER">CASHIER</option>
                        <option value="KITCHEN">KITCHEN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="SUPERADMIN">SUPERADMIN</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={createUser.isPending}>
                      {createUser.isPending ? 'Creating...' : 'Create User'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => {
                      setIsCreating(false)
                      setFormData({ name: '', email: '', password: '', role: 'USER' })
                      setShowCreatePassword(false)
                    }}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>{users?.length || 0} users total</CardDescription>
            </CardHeader>
            <CardContent>
              {users && users.length > 0 ? (
                <div className="space-y-4">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      {editingUserId === user.id ? (
                        <form onSubmit={handleUpdate} className="flex-1 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Name</label>
                              <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="mt-1 w-full rounded-md border p-2"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Email</label>
                              <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 w-full rounded-md border p-2"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">New Password (leave blank to keep current)</label>
                              <div className="relative">
                                <input
                                  type={showEditPassword ? 'text' : 'password'}
                                  value={formData.password}
                                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                  className="mt-1 w-full rounded-md border p-2 pr-10"
                                  minLength={6}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEditPassword(!showEditPassword)}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
                                  tabIndex={-1}
                                >
                                  {showEditPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Role</label>
                              <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                                className="mt-1 w-full rounded-md border p-2"
                                required
                              >
                                <option value="USER">USER (No Access)</option>
                                <option value="CUSTOMER">CUSTOMER</option>
                                <option value="CASHIER">CASHIER</option>
                                <option value="KITCHEN">KITCHEN</option>
                                <option value="ADMIN">ADMIN</option>
                                <option value="SUPERADMIN">SUPERADMIN</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" size="sm" disabled={updateUser.isPending}>
                              {updateUser.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="font-semibold">{user.name || 'No name'}</div>
                              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getRoleColor(user.role)}`}>
                                {user.role}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {user.email}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created: {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={user.role}
                              onChange={(e) => handleQuickRoleUpdate(user.id, e.target.value as any)}
                              className="rounded-md border p-2 text-sm"
                              disabled={updateRole.isPending}
                            >
                              <option value="USER">USER</option>
                              <option value="CUSTOMER">CUSTOMER</option>
                              <option value="CASHIER">CASHIER</option>
                              <option value="KITCHEN">KITCHEN</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPERADMIN">SUPERADMIN</option>
                            </select>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(user)}
                              className="active:scale-95 transition-transform"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(user.id)}
                              disabled={user.id === session?.user?.id || deleteUser.isPending}
                              className="active:scale-95 transition-transform text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="mx-auto mb-2 h-12 w-12" />
                  <p>No users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

