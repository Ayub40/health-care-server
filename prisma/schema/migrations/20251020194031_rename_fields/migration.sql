/*
  Warnings:

  - You are about to drop the column `createAt` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `appointments` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `createAt` on the `prescriptions` table. All the data in the column will be lost.
  - You are about to drop the column `updateAt` on the `prescriptions` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `appointments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `prescriptions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "appointments" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "prescriptions" DROP COLUMN "createAt",
DROP COLUMN "updateAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
