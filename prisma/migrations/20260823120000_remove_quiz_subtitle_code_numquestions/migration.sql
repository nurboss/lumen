-- Remove unused Quiz fields: subtitle, code, numberOfQuestions
ALTER TABLE "Quiz" DROP COLUMN IF EXISTS "subtitle";
ALTER TABLE "Quiz" DROP COLUMN IF EXISTS "code";
ALTER TABLE "Quiz" DROP COLUMN IF EXISTS "numberOfQuestions";
