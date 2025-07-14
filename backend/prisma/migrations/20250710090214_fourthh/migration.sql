/*
  Warnings:

  - You are about to drop the column `totalScore` on the `leaderboard` table. All the data in the column will be lost.
  - Added the required column `name` to the `leaderboard` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "leaderboard" DROP COLUMN "totalScore",
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalQuestions" INTEGER NOT NULL DEFAULT 0;
