-- DropIndex
DROP INDEX "Assessment_jobId_kind_key";

-- AlterTable
ALTER TABLE "Assessment" ADD COLUMN     "problemSlug" TEXT;

-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "code" TEXT,
ADD COLUMN     "language" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Assessment_jobId_key" ON "Assessment"("jobId");

