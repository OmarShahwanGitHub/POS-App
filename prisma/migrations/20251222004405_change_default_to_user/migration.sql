-- Change default role to USER (enum value must be committed first)
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'USER';

