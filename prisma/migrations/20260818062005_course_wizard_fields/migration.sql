-- CreateEnum
CREATE TYPE "InstructorRole" AS ENUM ('LEAD', 'SUPPORT');

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "badgeImageUrl" TEXT,
ADD COLUMN     "faq" JSONB;

-- CreateTable
CREATE TABLE "CourseInstructor" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "InstructorRole" NOT NULL DEFAULT 'LEAD',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CourseInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourseInstructor_courseId_order_idx" ON "CourseInstructor"("courseId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "CourseInstructor_courseId_userId_key" ON "CourseInstructor"("courseId", "userId");

-- AddForeignKey
ALTER TABLE "CourseInstructor" ADD CONSTRAINT "CourseInstructor_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseInstructor" ADD CONSTRAINT "CourseInstructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
