-- Step 1: Add USER to enum (must be committed separately)
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';

-- Step 2: Change default (this will run after enum is committed)
-- Note: If this fails, run manually: ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';
