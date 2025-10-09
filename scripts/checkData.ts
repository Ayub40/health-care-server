import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkData() {
    const users = await prisma.user.findMany();
    const admins = await prisma.admin.findMany();
    const doctors = await prisma.doctor.findMany();
    const patients = await prisma.patient.findMany();

    console.log('Users:', users.length);
    console.log('Admins:', admins.length);
    console.log('Doctors:', doctors.length);
    console.log('Patients:', patients.length);
}

checkData().finally(() => prisma.$disconnect());

// Check Data -- > vs code er terminal e 
// npx ts-node-dev --transpile-only ./scripts/checkData.ts
