/*
  Warnings:

  - You are about to drop the `QuestionTag` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_QuestionTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_QuestionTags" DROP CONSTRAINT "_QuestionTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_QuestionTags" DROP CONSTRAINT "_QuestionTags_B_fkey";

-- DropTable
DROP TABLE "QuestionTag";

-- DropTable
DROP TABLE "_QuestionTags";
