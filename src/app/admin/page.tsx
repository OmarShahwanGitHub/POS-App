'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Pencil, Trash2, AlertCircle, LogOut } from 'lucide-react'

export default function AdminPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { data: menuItems, refetch, error } = trpc.menu.getAll.useQuery()
  const createMenuItem = trpc.menu.create.useMutation({ onSuccess: () => refetch() })
  const updateMenuItem = trpc.menu.update.useMutation({ onSuccess: () => refetch() })
  const deleteMenuItem = trpc.menu.delete.useMutation({ onSuccess: () => refetch() })

  const addCustomization = trpc.menu.addCustomization.useMutation({ onSuccess: () => refetch() })
  const deleteCustomization = trpc.menu.deleteCustomization.useMutation({ onSuccess: () => refetch() })

  const [editingItem, setEditingItem] = useState<any>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'BURGER',
  })
  const [customizationForm, setCustomizationForm] = useState({
    type: '',
    name: '',
    price: '0',
  })
  const [showCopyFromOther, setShowCopyFromOther] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState('')
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [pendingCustomizations, setPendingCustomizations] = useState<Array<{type: string, name: string, price: number}>>([])
  const [allCategories, setAllCategories] = useState<string[]>(() => {
    // Initialize from localStorage on mount
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('customCategories')
      return stored ? JSON.parse(stored) : []
    }
    return []
  })
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isAddingCategory, setIsAddingCategory] = useState(false)

  // Get unique categories from all menu items AND track custom categories
  const existingCategories = Array.from(new Set([
    ...allCategories,
    ...(menuItems?.map(item => item.category) || [])
  ]))

  const roundPrice = (value: string, direction: 'up' | 'down') => {
    const num = parseFloat(value) || 0
    const remainder = num % 0.5

    if (remainder === 0) {
      // Already at a 0.5 increment, return as is
      return value
    }

    if (direction === 'up') {
      // Round up to nearest 0.5
      return (Math.ceil(num * 2) / 2).toFixed(2)
    } else {
      // Round down to nearest 0.5
      return (Math.floor(num * 2) / 2).toFixed(2)
    }
  }

  const handlePriceKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, field: 'price' | 'customizationPrice') => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const currentValue = field === 'price' ? formData.price : customizationForm.price
      const rounded = roundPrice(currentValue, 'up')
      if (field === 'price') {
        setFormData({ ...formData, price: rounded })
      } else {
        setCustomizationForm({ ...customizationForm, price: rounded })
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const currentValue = field === 'price' ? formData.price : customizationForm.price
      const rounded = roundPrice(currentValue, 'down')
      if (field === 'price') {
        setFormData({ ...formData, price: rounded })
      } else {
        setCustomizationForm({ ...customizationForm, price: rounded })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Track custom category
    if (!['BURGER', 'DRINK', 'SIDE'].includes(formData.category)) {
      if (!allCategories.includes(formData.category)) {
        const updatedCategories = [...allCategories, formData.category]
        setAllCategories(updatedCategories)
        localStorage.setItem('customCategories', JSON.stringify(updatedCategories))
      }
    }

    if (editingItem) {
      await updateMenuItem.mutateAsync({
        id: editingItem.id,
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
      })
    } else {
      // Create new menu item
      const newItem = await createMenuItem.mutateAsync({
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
      })

      // Add pending customizations to the newly created item
      if (pendingCustomizations.length > 0 && newItem) {
        for (const custom of pendingCustomizations) {
          await addCustomization.mutateAsync({
            menuItemId: newItem.id,
            type: custom.type,
            name: custom.name,
            price: custom.price,
          })
        }
        setPendingCustomizations([])
      }
    }

    setFormData({ name: '', description: '', price: '', category: existingCategories[0] || 'BURGER' })
    setEditingItem(null)
    setIsCreating(false)
    setShowCustomCategory(false)
  }

  const handleEdit = (item: any) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
    })
    setShowCustomCategory(false)
    setIsCreating(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      await deleteMenuItem.mutateAsync({ id })
    }
  }

  const handleDeleteCategory = async (category: string) => {
    const itemsInCategory = menuItems?.filter(item => item.category === category) || []

    // Only show confirmation if there are items in the category
    if (itemsInCategory.length > 0) {
      const confirmMessage = `Are you sure you want to delete the "${category}" category? This will delete ${itemsInCategory.length} menu item${itemsInCategory.length !== 1 ? 's' : ''}.`
      if (!confirm(confirmMessage)) {
        return
      }
    }

    // Delete all items in the category
    for (const item of itemsInCategory) {
      await deleteMenuItem.mutateAsync({ id: item.id })
    }

    // Remove category from tracked categories
    const updatedCategories = allCategories.filter(c => c !== category)
    setAllCategories(updatedCategories)
    localStorage.setItem('customCategories', JSON.stringify(updatedCategories))

    // Close edit modal if editing an item from this category
    if (editingItem && editingItem.category === category) {
      setEditingItem(null)
      setIsCreating(false)
      setShowCustomCategory(false)
    }

    await refetch()
  }

  const handleAddCategory = () => {
    const categoryName = newCategoryName.trim().toUpperCase()

    if (!categoryName) {
      alert('Please enter a category name')
      return
    }

    if (existingCategories.includes(categoryName)) {
      alert('This category already exists')
      return
    }

    const updatedCategories = [...allCategories, categoryName]
    setAllCategories(updatedCategories)
    localStorage.setItem('customCategories', JSON.stringify(updatedCategories))
    setNewCategoryName('')
    setIsAddingCategory(false)
  }

  const handleCancel = () => {
    setFormData({ name: '', description: '', price: '', category: existingCategories[0] || 'BURGER' })
    setEditingItem(null)
    setIsCreating(false)
    setShowCustomCategory(false)
  }

  const handleAddCustomization = async (e: React.FormEvent) => {
    e.preventDefault()

    const newCustomization = {
      type: customizationForm.type,
      name: customizationForm.name,
      price: parseFloat(customizationForm.price),
    }

    if (editingItem) {
      // For existing items, add directly to database
      await addCustomization.mutateAsync({
        menuItemId: editingItem.id,
        ...newCustomization,
      })
    } else {
      // For new items, add to pending list
      setPendingCustomizations([...pendingCustomizations, newCustomization])
    }

    setCustomizationForm({ type: '', name: '', price: '0' })
  }

  const handleDeleteCustomization = async (customizationId: string) => {
    if (confirm('Are you sure you want to delete this customization?')) {
      await deleteCustomization.mutateAsync({ id: customizationId })
    }
  }

  const handleDeletePendingCustomization = (index: number) => {
    setPendingCustomizations(pendingCustomizations.filter((_, i) => i !== index))
  }

  const handleRemoveAllCustomizations = async () => {
    if (!editingItem?.customizationTemplates || editingItem.customizationTemplates.length === 0) {
      return
    }

    if (confirm(`Are you sure you want to remove all ${editingItem.customizationTemplates.length} customizations?`)) {
      for (const custom of editingItem.customizationTemplates) {
        await deleteCustomization.mutateAsync({ id: custom.id })
      }

      // Refetch to update the UI
      await refetch()
      alert('All customizations removed successfully!')
    }
  }

  const handleCopyCustomization = async (custom: any) => {
    if (editingItem) {
      // For existing items, add to database
      await addCustomization.mutateAsync({
        menuItemId: editingItem.id,
        type: custom.type,
        name: custom.name,
        price: custom.price,
      })
    } else {
      // For new items, add to pending list
      const isDuplicate = pendingCustomizations.some(
        c => c.type === custom.type && c.name === custom.name
      )
      if (!isDuplicate) {
        setPendingCustomizations([...pendingCustomizations, {
          type: custom.type,
          name: custom.name,
          price: custom.price,
        }])
      }
    }
  }

  const handleCopyAllCustomizations = async (sourceItem: any) => {
    if (!sourceItem.customizationTemplates) return

    if (editingItem) {
      // For existing items, add to database
      const customizationsToAdd = sourceItem.customizationTemplates.filter(
        (custom: any) => !editingItem.customizationTemplates?.some(
          (ec: any) => ec.type === custom.type && ec.name === custom.name
        )
      )

      if (customizationsToAdd.length === 0) {
        return
      }

      for (const custom of customizationsToAdd) {
        await addCustomization.mutateAsync({
          menuItemId: editingItem.id,
          type: custom.type,
          name: custom.name,
          price: custom.price,
        })
      }
    } else {
      // For new items, add to pending list
      const customizationsToAdd = sourceItem.customizationTemplates.filter(
        (custom: any) => !pendingCustomizations.some(
          (pc: any) => pc.type === custom.type && pc.name === custom.name
        )
      )

      if (customizationsToAdd.length === 0) {
        return
      }

      const newPending = customizationsToAdd.map((custom: any) => ({
        type: custom.type,
        name: custom.name,
        price: custom.price,
      }))

      setPendingCustomizations([...pendingCustomizations, ...newPending])
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary">Admin Dashboard</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Menu Items List */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Menu Items</CardTitle>
                    <CardDescription>Manage your restaurant menu</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCategoryManager(!showCategoryManager)}>
                      Manage Categories
                    </Button>
                    <Button onClick={() => setIsCreating(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {/* Category Manager */}
                {showCategoryManager && (
                  <div className="mt-4 rounded-lg border bg-muted/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-sm font-medium">Current Categories:</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddingCategory(!isAddingCategory)}
                      >
                        <Plus className="mr-1 h-3 w-3" />
                        Add Category
                      </Button>
                    </div>

                    {/* Add Category Form */}
                    {isAddingCategory && (
                      <div className="mb-3 rounded-lg border bg-background p-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleAddCategory()
                              }
                            }}
                            placeholder="Enter category name (e.g., DESSERT)"
                            className="flex-1 rounded-md border p-2 text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={handleAddCategory}
                          >
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAddingCategory(false)
                              setNewCategoryName('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      {existingCategories.map((category) => {
                        const itemCount = menuItems?.filter(item => item.category === category).length || 0
                        return (
                          <div key={category} className="flex items-center justify-between rounded-lg border bg-background p-2">
                            <div>
                              <div className="font-medium">{category}</div>
                              <div className="text-xs text-muted-foreground">
                                {itemCount} item{itemCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCategory(category)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        )
                      })}
                      {existingCategories.length === 0 && (
                        <div className="text-center text-sm text-muted-foreground">
                          No categories yet. Add a category above to get started.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {menuItems?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} • {item.category}
                        </div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                        {item.customizationTemplates && item.customizationTemplates.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.customizationTemplates.length} customization{item.customizationTemplates.length !== 1 ? 's' : ''} available
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Create/Edit Form */}
          {isCreating && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>{editingItem ? 'Edit Item' : 'Create New Item'}</CardTitle>
                  <CardDescription>
                    {editingItem ? 'Update menu item details' : 'Add a new item to the menu'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
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
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="mt-1 w-full rounded-md border p-2"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Price</label>
                      <input
                        type="number"
                        step="0.5"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        onKeyDown={(e) => handlePriceKeyDown(e, 'price')}
                        className="mt-1 w-full rounded-md border p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      {!showCustomCategory ? (
                        <div className="flex gap-2">
                          <select
                            value={formData.category}
                            onChange={(e) => {
                              if (e.target.value === 'CUSTOM') {
                                setShowCustomCategory(true)
                                setFormData({ ...formData, category: '' })
                              } else {
                                setFormData({ ...formData, category: e.target.value })
                              }
                            }}
                            className="mt-1 flex-1 rounded-md border p-2"
                          >
                            {existingCategories.map((category) => (
                              <option key={category} value={category}>
                                {category.charAt(0) + category.slice(1).toLowerCase()}
                              </option>
                            ))}
                            <option value="CUSTOM">+ Custom Category</option>
                          </select>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value.toUpperCase() })}
                            placeholder="Enter category (e.g., DESSERT)"
                            className="mt-1 flex-1 rounded-md border p-2"
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCustomCategory(false)
                              setFormData({ ...formData, category: existingCategories[0] || 'BURGER' })
                            }}
                            className="mt-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingItem ? 'Update' : 'Create'}
                      </Button>
                      <Button type="button" variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Customization Management - Show when editing OR creating */}
              {(editingItem || isCreating) && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Customizations</CardTitle>
                    <CardDescription>
                      Manage available customizations for this menu item
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* List existing customizations (for editing existing items) */}
                    {editingItem && editingItem.customizationTemplates && editingItem.customizationTemplates.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium">Current Customizations:</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={handleRemoveAllCustomizations}
                            className="text-xs"
                          >
                            <Trash2 className="mr-1 h-3 w-3" />
                            Remove All ({editingItem.customizationTemplates.length})
                          </Button>
                        </div>
                        {editingItem.customizationTemplates.map((custom: any) => (
                          <div
                            key={custom.id}
                            className="flex items-center justify-between rounded-lg border p-2"
                          >
                            <div>
                              <div className="text-sm font-medium">{custom.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {custom.type}{custom.price > 0 && ` • +$${custom.price.toFixed(2)}`}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteCustomization(custom.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* List pending customizations (for new items) */}
                    {!editingItem && pendingCustomizations.length > 0 && (
                      <div className="mb-4 space-y-2">
                        <div className="text-sm font-medium">Customizations to add:</div>
                        {pendingCustomizations.map((custom, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border p-2"
                          >
                            <div>
                              <div className="text-sm font-medium">{custom.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {custom.type}{custom.price > 0 && ` • +$${custom.price.toFixed(2)}`}
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeletePendingCustomization(index)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new customization form */}
                    <form onSubmit={handleAddCustomization} className="space-y-3">
                      <div className="text-sm font-medium">Add New Customization:</div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="text-xs font-medium">Type (e.g., remove_cheese)</label>
                          <input
                            type="text"
                            value={customizationForm.type}
                            onChange={(e) =>
                              setCustomizationForm({ ...customizationForm, type: e.target.value })
                            }
                            className="mt-1 w-full rounded-md border p-2 text-sm"
                            placeholder="remove_cheese"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">Display Name</label>
                          <input
                            type="text"
                            value={customizationForm.name}
                            onChange={(e) =>
                              setCustomizationForm({ ...customizationForm, name: e.target.value })
                            }
                            className="mt-1 w-full rounded-md border p-2 text-sm"
                            placeholder="No Cheese"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium">
                          Additional Price (default: $0.00)
                        </label>
                        <input
                          type="number"
                          step="0.5"
                          value={customizationForm.price}
                          onChange={(e) =>
                            setCustomizationForm({ ...customizationForm, price: e.target.value })
                          }
                          onKeyDown={(e) => handlePriceKeyDown(e, 'customizationPrice')}
                          className="mt-1 w-full rounded-md border p-2 text-sm"
                        />
                      </div>
                      <Button type="submit" size="sm" className="w-full">
                        <Plus className="mr-2 h-3 w-3" />
                        Add Customization
                      </Button>
                    </form>

                    {/* Copy from other items */}
                    <div className="mt-4 border-t pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setShowCopyFromOther(!showCopyFromOther)}
                      >
                        {showCopyFromOther ? 'Hide' : 'Show'} Customizations from Other Items
                      </Button>

                      {showCopyFromOther && (
                        <div className="mt-3 space-y-3">
                          {menuItems
                            ?.filter((item) => item.id !== editingItem?.id)
                            .map((item) => {
                              if (!item.customizationTemplates || item.customizationTemplates.length === 0) {
                                return null
                              }

                              // Count how many can be added
                              const canAddCount = item.customizationTemplates.filter(
                                (custom: any) => !editingItem?.customizationTemplates?.some(
                                  (ec: any) => ec.type === custom.type && ec.name === custom.name
                                )
                              ).length

                              return (
                                <div key={item.id} className="rounded-lg border bg-muted/50 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="text-sm font-medium">{item.name}</div>
                                    {canAddCount > 0 && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopyAllCustomizations(item)}
                                        className="text-xs"
                                      >
                                        <Plus className="mr-1 h-3 w-3" />
                                        Add All ({canAddCount})
                                      </Button>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    {item.customizationTemplates.map((custom: any) => {
                                      // Check if this customization already exists on current item or in pending list
                                      const alreadyExists = editingItem
                                        ? editingItem.customizationTemplates?.some(
                                            (ec: any) => ec.type === custom.type && ec.name === custom.name
                                          )
                                        : pendingCustomizations.some(
                                            (pc: any) => pc.type === custom.type && pc.name === custom.name
                                          )

                                      return (
                                        <div
                                          key={custom.id}
                                          className="flex items-center justify-between rounded border bg-background p-2"
                                        >
                                          <div className="text-xs">
                                            <div className="font-medium">{custom.name}</div>
                                            <div className="text-muted-foreground">
                                              {custom.type}{custom.price > 0 && ` • +$${custom.price.toFixed(2)}`}
                                            </div>
                                          </div>
                                          {alreadyExists ? (
                                            <span className="text-xs text-muted-foreground">Already added</span>
                                          ) : (
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleCopyCustomization(custom)}
                                            >
                                              <Plus className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )
                            })}
                          {menuItems?.filter(
                            (item) =>
                              item.id !== editingItem?.id &&
                              item.customizationTemplates &&
                              item.customizationTemplates.length > 0
                          ).length === 0 && (
                            <div className="text-center text-xs text-muted-foreground">
                              No other items have customizations yet
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
