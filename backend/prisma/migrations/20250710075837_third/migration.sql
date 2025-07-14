/*
  Warnings:

  - You are about to drop the column `option1` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `option2` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `option3` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `option4` on the `questions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "questions" DROP COLUMN "option1",
DROP COLUMN "option2",
DROP COLUMN "option3",
DROP COLUMN "option4";

-- CreateTable
CREATE TABLE "options" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "questionId" INTEGER NOT NULL,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
