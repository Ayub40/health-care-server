import { Request } from "express";
import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { fileUploader } from "../../helper/fileUploader";
import { Admin, Doctor, Prisma, UserRole, UserStatus } from "@prisma/client";
import { IOptions, paginationHelper } from "../../helper/paginationHelper";
import { userSearchableFields } from "./user.constant";
import { IJWTPayload } from "../../types/common";
import config from "../../../config";


const createPatient = async (req: Request) => {

    if (req.file) {
        const uploadResult = await fileUploader.uploadToCloudinary(req.file)
        req.body.patient.profilePhoto = uploadResult?.secure_url
        console.log(uploadResult);
    }

    const hashPassword = await bcrypt.hash(req.body.password, 10);

    // multiple kaj korte "$transaction" use korte hoy,, ekhane user and patient create kora hoyse
    const result = await prisma.$transaction(async (tnx) => {
        await tnx.user.create({
            data: {
                email: req.body.patient.email,
                password: hashPassword
            }
        });

        return await tnx.patient.create({
            data: req.body.patient
        })
    })

    return result;
}

const createAdmin = async (req: Request): Promise<Admin> => {

    const file = req.file;

    if (file) {
        const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
        req.body.admin.profilePhoto = uploadToCloudinary?.secure_url
    }

    const hashedPassword: string = await bcrypt.hash(req.body.password, 10)

    const userData = {
        email: req.body.admin.email,
        password: hashedPassword,
        role: UserRole.ADMIN
    }

    const result = await prisma.$transaction(async (transactionClient) => {
        await transactionClient.user.create({
            data: userData
        });

        const createdAdminData = await transactionClient.admin.create({
            data: req.body.admin
        });

        return createdAdminData;
    });

    return result;
};

// Update Doctor Service with Specialties Handling
const createDoctor = async (req: Request): Promise<Doctor> => {
    const file = req.file;

    if (file) {
        const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
        req.body.doctor.profilePhoto = uploadToCloudinary?.secure_url;
    }

    const hashedPassword: string = await bcrypt.hash(
        req.body.password,
        Number(config.salt_round)
    );

    const userData = {
        email: req.body.doctor.email,
        password: hashedPassword,
        role: UserRole.DOCTOR,
    };

    // Extract specialties from doctor data
    const { specialties, ...doctorData } = req.body.doctor;

    const result = await prisma.$transaction(async (transactionClient) => {
        // Step 1: Create user
        await transactionClient.user.create({
            data: userData,
        });

        // Step 2: Create doctor
        const createdDoctorData = await transactionClient.doctor.create({
            data: doctorData,
        });

        // Step 3: Create doctor specialties if provided
        if (specialties && Array.isArray(specialties) && specialties.length > 0) {
            // Verify all specialties exist
            const existingSpecialties = await transactionClient.specialties.findMany({
                where: {
                    id: {
                        in: specialties,
                    },
                },
                select: {
                    id: true,
                },
            });

            const existingSpecialtyIds = existingSpecialties.map((s) => s.id);
            const invalidSpecialties = specialties.filter(
                (id) => !existingSpecialtyIds.includes(id)
            );

            if (invalidSpecialties.length > 0) {
                throw new Error(
                    `Invalid specialty IDs: ${invalidSpecialties.join(", ")}`
                );
            }

            // Create doctor specialties relations
            const doctorSpecialtiesData = specialties.map((specialtyId) => ({
                doctorId: createdDoctorData.id,
                specialitiesId: specialtyId,
            }));

            await transactionClient.doctorSpecialties.createMany({
                data: doctorSpecialtiesData,
            });
        }

        // Step 4: Return doctor with specialties
        const doctorWithSpecialties = await transactionClient.doctor.findUnique({
            where: {
                id: createdDoctorData.id,
            },
            include: {
                doctorSpecialties: {
                    include: {
                        specialities: true,
                    },
                },
            },
        });

        return doctorWithSpecialties!;
    });

    return result;
};



// Old createDoctor function without specialties handling

// const createDoctor = async (req: Request): Promise<Doctor> => {

//     const file = req.file;

//     if (file) {
//         const uploadToCloudinary = await fileUploader.uploadToCloudinary(file);
//         req.body.doctor.profilePhoto = uploadToCloudinary?.secure_url
//     }
//     const hashedPassword: string = await bcrypt.hash(req.body.password, 10)

//     const userData = {
//         email: req.body.doctor.email,
//         password: hashedPassword,
//         role: UserRole.DOCTOR
//     }

//     const result = await prisma.$transaction(async (transactionClient) => {
//         await transactionClient.user.create({
//             data: userData
//         });

//         const createdDoctorData = await transactionClient.doctor.create({
//             data: req.body.doctor
//         });

//         return createdDoctorData;
//     });

//     return result;
// };

// const getAllFromDB = async () => {
//     const result = await prisma.user.findMany();
//     return result
// }

const getAllFromDB = async (params: any, options: IOptions) => {
    const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options)
    const { searchTerm, ...filterData } = params;

    const andConditions: Prisma.UserWhereInput[] = [];

    if (searchTerm) {
        andConditions.push({
            OR: userSearchableFields.map(field => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive"
                }
            }))
        })
    }

    if (Object.keys(filterData).length > 0) {
        andConditions.push({
            AND: Object.keys(filterData).map(key => ({
                [key]: {
                    equals: (filterData as any)[key]
                }
            }))
        })
    }

    const whereConditions: Prisma.UserWhereInput = andConditions.length > 0 ? {
        AND: andConditions
    } : {}

    console.log(andConditions);

    const result = await prisma.user.findMany({
        skip,
        take: limit,

        where: whereConditions,
        orderBy: {
            [sortBy]: sortOrder
        }
    });

    const total = await prisma.user.count({
        where: whereConditions
    });
    return {
        meta: {
            page,
            limit,
            total
        },
        data: result
    };
}

const getMyProfile = async (user: IJWTPayload) => {
    const userInfo = await prisma.user.findUniqueOrThrow({
        where: {
            email: user.email,
            status: UserStatus.ACTIVE
        },

        // Kon kon field dekhate chai
        select: {
            id: true,
            email: true,
            needPasswordChange: true,
            role: true,
            status: true
        }
    })

    let profileData;

    if (userInfo.role === UserRole.PATIENT) {
        profileData = await prisma.patient.findUnique({
            where: {
                email: userInfo.email
            }
        })
    }
    else if (userInfo.role === UserRole.DOCTOR) {
        profileData = await prisma.doctor.findUnique({
            where: {
                email: userInfo.email
            }
        })
    }
    else if (userInfo.role === UserRole.ADMIN) {
        profileData = await prisma.admin.findUnique({
            where: {
                email: userInfo.email
            }
        })
    }

    return {
        ...userInfo,
        ...profileData
    };

};

const changeProfileStatus = async (id: string, payload: { status: UserStatus }) => {
    const userData = await prisma.user.findUniqueOrThrow({
        where: {
            id
        }
    })

    const updateUserStatus = await prisma.user.update({
        where: {
            id
        },
        data: payload
    })

    return updateUserStatus;
};


export const UserService = {
    createPatient,
    createAdmin,
    createDoctor,
    getAllFromDB,
    getMyProfile,
    changeProfileStatus
}