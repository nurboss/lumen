-- Remove Parent, Banner, Seminar, Blog (+ categories/reviews) and Institute features.

-- Reassign any existing PARENT users to STUDENT so the enum value can be dropped.
UPDATE "User" SET "role" = 'STUDENT' WHERE "role" = 'PARENT';

-- Drop feature tables (CASCADE clears their foreign keys).
DROP TABLE IF EXISTS "ParentStudent" CASCADE;
DROP TABLE IF EXISTS "BlogReview" CASCADE;
DROP TABLE IF EXISTS "Blog" CASCADE;
DROP TABLE IF EXISTS "BlogCategory" CASCADE;
DROP TABLE IF EXISTS "SeminarParticipant" CASCADE;
DROP TABLE IF EXISTS "Seminar" CASCADE;
DROP TABLE IF EXISTS "Banner" CASCADE;
DROP TABLE IF EXISTS "Institute" CASCADE;

-- Drop the now-unused BlogStatus enum.
DROP TYPE IF EXISTS "BlogStatus";

-- Remove PARENT from the Role enum.
ALTER TYPE "Role" RENAME TO "Role_old";
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTRUCTOR', 'AGENT', 'STUDENT');
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING ("role"::text::"Role");
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STUDENT';
DROP TYPE "Role_old";
