-- Introduce SectionItem: an ordered curriculum entry (unit / quiz / assignment)
-- replacing Section's single quizId/assignmentId columns.

-- CreateEnum
CREATE TYPE "SectionItemKind" AS ENUM ('UNIT', 'QUIZ', 'ASSIGNMENT');

-- CreateTable
CREATE TABLE "SectionItem" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "kind" "SectionItemKind" NOT NULL,
    "unitId" TEXT,
    "quizId" TEXT,
    "assignmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SectionItem_unitId_key" ON "SectionItem"("unitId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionItem_quizId_key" ON "SectionItem"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionItem_assignmentId_key" ON "SectionItem"("assignmentId");

-- CreateIndex
CREATE INDEX "SectionItem_sectionId_order_idx" ON "SectionItem"("sectionId", "order");

-- AddForeignKey
ALTER TABLE "SectionItem" ADD CONSTRAINT "SectionItem_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionItem" ADD CONSTRAINT "SectionItem_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionItem" ADD CONSTRAINT "SectionItem_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionItem" ADD CONSTRAINT "SectionItem_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing units become UNIT items, preserving their order.
INSERT INTO "SectionItem" ("id", "sectionId", "order", "kind", "unitId", "createdAt")
SELECT gen_random_uuid()::text, u."sectionId", u."order", 'UNIT', u."id", CURRENT_TIMESTAMP
FROM "Unit" u
WHERE u."sectionId" IS NOT NULL;

-- Backfill: each section's attached quiz becomes a QUIZ item after its units.
INSERT INTO "SectionItem" ("id", "sectionId", "order", "kind", "quizId", "createdAt")
SELECT gen_random_uuid()::text, s."id",
  COALESCE((SELECT MAX(u."order") FROM "Unit" u WHERE u."sectionId" = s."id"), -1) + 1,
  'QUIZ', s."quizId", CURRENT_TIMESTAMP
FROM "Section" s
WHERE s."quizId" IS NOT NULL;

-- Backfill: each section's attached assignment becomes an ASSIGNMENT item last.
INSERT INTO "SectionItem" ("id", "sectionId", "order", "kind", "assignmentId", "createdAt")
SELECT gen_random_uuid()::text, s."id",
  COALESCE((SELECT MAX(u."order") FROM "Unit" u WHERE u."sectionId" = s."id"), -1) + 2,
  'ASSIGNMENT', s."assignmentId", CURRENT_TIMESTAMP
FROM "Section" s
WHERE s."assignmentId" IS NOT NULL;

-- Drop the old single-attachment columns now that data is migrated.
-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Section" DROP CONSTRAINT "Section_quizId_fkey";

-- DropIndex
DROP INDEX "Section_assignmentId_key";

-- DropIndex
DROP INDEX "Section_quizId_key";

-- AlterTable
ALTER TABLE "Section" DROP COLUMN "assignmentId",
DROP COLUMN "quizId";
