/*
  Warnings:

  - A unique constraint covering the columns `[scheduleId]` on the table `appointments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[appointmentId]` on the table `doctor_schedules` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "doctor_schedules" ADD COLUMN     "appointmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "appointments_scheduleId_key" ON "appointments"("scheduleId");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedules_appointmentId_key" ON "doctor_schedules"("appointmentId");

-- AddForeignKey
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
