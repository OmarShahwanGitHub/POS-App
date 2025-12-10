import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting to seed customizations...')

  // Find the Single Patty Burger
  const singleBurger = await prisma.menuItem.findFirst({
    where: { name: { contains: 'Single', mode: 'insensitive' } },
  })

  // Find the Double Patty Burger
  const doubleBurger = await prisma.menuItem.findFirst({
    where: { name: { contains: 'Double', mode: 'insensitive' } },
  })

  if (singleBurger) {
    console.log(`Found Single Burger: ${singleBurger.name}`)

    const singleBurgerCustomizations = [
      { type: 'remove_cheese', name: 'No Cheese', price: 0 },
      { type: 'remove_pickles', name: 'No Pickles', price: 0 },
      { type: 'remove_onions', name: 'No Onions', price: 0 },
      { type: 'remove_sauce', name: 'No Sauce', price: 0 },
      { type: 'extra_cheese', name: 'Extra Cheese', price: 0 },
      { type: 'extra_pickles', name: 'Extra Pickles', price: 0 },
      { type: 'extra_onions', name: 'Extra Onions', price: 0 },
      { type: 'extra_sauce', name: 'Extra Sauce', price: 0 },
      { type: 'slice_half', name: 'Slice in Half', price: 0 },
      { type: 'didnt_pay', name: "Didn't Pay", price: 0 },
      { type: 'after_jumah', name: 'After Jumah', price: 0 },
    ]

    for (const custom of singleBurgerCustomizations) {
      await prisma.customizationTemplate.create({
        data: {
          menuItemId: singleBurger.id,
          ...custom,
        },
      })
    }
    console.log(`Added ${singleBurgerCustomizations.length} customizations to Single Burger`)
  }

  if (doubleBurger) {
    console.log(`Found Double Burger: ${doubleBurger.name}`)

    const doubleBurgerCustomizations = [
      { type: 'remove_cheese', name: 'No Cheese', price: 0 },
      { type: 'one_cheese', name: 'One Cheese', price: 0 },
      { type: 'remove_pickles', name: 'No Pickles', price: 0 },
      { type: 'remove_onions', name: 'No Onions', price: 0 },
      { type: 'remove_sauce', name: 'No Sauce', price: 0 },
      { type: 'extra_cheese', name: 'Extra Cheese', price: 0 },
      { type: 'extra_pickles', name: 'Extra Pickles', price: 0 },
      { type: 'extra_onions', name: 'Extra Onions', price: 0 },
      { type: 'extra_sauce', name: 'Extra Sauce', price: 0 },
      { type: 'extra_patty', name: 'Extra Patty (+$2)', price: 2 },
      { type: 'slice_half', name: 'Slice in Half', price: 0 },
      { type: 'didnt_pay', name: "Didn't Pay", price: 0 },
      { type: 'after_jumah', name: 'After Jumah', price: 0 },
    ]

    for (const custom of doubleBurgerCustomizations) {
      await prisma.customizationTemplate.create({
        data: {
          menuItemId: doubleBurger.id,
          ...custom,
        },
      })
    }
    console.log(`Added ${doubleBurgerCustomizations.length} customizations to Double Burger`)
  }

  console.log('Customizations seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
