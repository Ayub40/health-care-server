import { prisma } from "../../shared/prisma";
import { IJWTPayload } from "../../types/common";

const insertIntoDB = async (user: IJWTPayload, payload: {
    scheduleIds: string[]
}) => {
    const doctorData = await prisma.doctor.findUniqueOrThrow({
        where: {
            email: user.email
        }
    });

    const doctorScheduleData = payload.scheduleIds.map(scheduleId => ({
        doctorId: doctorData.id,
        scheduleId
    }))

    console.log(doctorScheduleData);

    return await prisma.doctorSchedules.createMany({
        data: doctorScheduleData
    });
}

// const getAllFromDB = async () => {
//     return await prisma.doctorSchedules.findMany({
//         include: {
//             doctor: true,
//             schedule: true
//         },
//         orderBy: {
//             createdAt: "desc"
//         }
//     });
// };

export const DoctorScheduleService = {
    insertIntoDB,
    // getAllFromDB
}