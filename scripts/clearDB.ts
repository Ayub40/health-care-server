import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function clearDatabase() {

  // await prisma.admin.deleteMany({});
  // await prisma.doctor.deleteMany({});
  // await prisma.patient.deleteMany({});
  // await prisma.user.deleteMany({});

  // await prisma.review.deleteMany({});
  // await prisma.prescription.deleteMany({});
  // await prisma.payment.deleteMany({});
  // await prisma.appointment.deleteMany({});
  // await prisma.doctorSchedules.deleteMany({});
  // await prisma.schedule.deleteMany({})

  // await prisma.specialty.deleteMany({});
  // await prisma.doctorSpecialty.deleteMany({});

  console.log('✅ All data deleted successfully');
}

clearDatabase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());



// Project er Root e scripts --> clearDb.ts ,, file create korte hobe
// npx ts-node-dev --transpile-only ./scripts/clearDB.ts
// pnpm dev

