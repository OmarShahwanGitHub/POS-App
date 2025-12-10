/*
  Warnings:

  - Changed the type of `category` on the `MenuItem` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable - Change category from enum to string while preserving data
ALTER TABLE "MenuItem" ADD COLUMN "category_new" TEXT;

-- Copy existing data, converting enum values to text
UPDATE "MenuItem" SET "category_new" = "category"::text;

-- Make the new column required
ALTER TABLE "MenuItem" ALTER COLUMN "category_new" SET NOT NULL;

-- Drop the old column
ALTER TABLE "MenuItem" DROP COLUMN "category";

-- Rename the new column to the original name
ALTER TABLE "MenuItem" RENAME COLUMN "category_new" TO "category";

-- DropEnum
DROP TYPE "MenuCategory";
