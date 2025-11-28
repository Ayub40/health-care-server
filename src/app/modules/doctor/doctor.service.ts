import { Doctor, Prisma, UserStatus } from "@prisma/client";
import { paginationHelper } from "../../helper/paginationHelper";
import { prisma } from "../../shared/prisma";
import { IPaginationOptions } from "../../interfaces/pagination";
import { doctorSearchableFields } from "./doctor.constant";
import { IDoctorFilterRequest, IDoctorUpdate } from "./doctor.interface";
import { askOpenRouter } from "../../helper/openRouterClient";

const getAllFromDB = async (
    filters: IDoctorFilterRequest,
    options: IPaginationOptions
) => {
    const { limit, page, skip } = paginationHelper.calculatePagination(options);
    const { searchTerm, specialties, ...filterData } = filters;

    const andConditions: Prisma.DoctorWhereInput[] = [];

    if (searchTerm) {
        andConditions.push({
            OR: doctorSearchableFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive",
                },
            })),
        });
    }

    // doctor > doctorSpecialties > specialties -> title
    // Handle multiple specialties: ?specialties=Cardiology&specialties=Neurology
    if (specialties && specialties.length > 0) {
        // Convert to array if single string
        const specialtiesArray = Array.isArray(specialties) ? specialties : [specialties];

        andConditions.push({
            doctorSpecialties: {
                some: {
                    specialities: {
                        title: {
                            in: specialtiesArray,
                            mode: "insensitive",
                        },
                    },
                },
            },
        });
    }

    if (Object.keys(filterData).length > 0) {
        const filterConditions = Object.keys(filterData).map((key) => ({
            [key]: {
                equals: (filterData as any)[key],
            },
        }));
        andConditions.push(...filterConditions);
    }

    andConditions.push({
        isDeleted: false,
    });

    const whereConditions: Prisma.DoctorWhereInput =
        andConditions.length > 0 ? { AND: andConditions } : {};

    const result = await prisma.doctor.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy:
            options.sortBy && options.sortOrder
                ? { [options.sortBy]: options.sortOrder }
                : { averageRating: "desc" },
        include: {
            doctorSpecialties: {
                include: {
                    specialities: {
                        select: {
                            title: true,
                        }
                    },
                },
            },
            doctorSchedules: {
                include: {
                    schedule: true
                }
            },
            // review: {
            reviews: {
                select: {
                    rating: true,
                },
            },
        },
    });

    // console.log(result[0].doctorSpecialties);

    const total = await prisma.doctor.count({
        where: whereConditions,
    });

    return {
        meta: {
            total,
            page,
            limit,
        },
        data: result,
    };
};

const getByIdFromDB = async (id: string): Promise<Doctor | null> => {
    const result = await prisma.doctor.findUnique({
        where: {
            id,
            isDeleted: false,
        },
        include: {
            doctorSpecialties: {
                include: {
                    specialities: true,
                },
            },
            doctorSchedules: {
                include: {
                    schedule: true
                }
            },
            // review: true, 
            reviews: true,
        },
    });
    return result;
};

const updateIntoDB = async (id: string, payload: IDoctorUpdate) => {
    const { specialties, removeSpecialties, ...doctorData } = payload;

    const doctorInfo = await prisma.doctor.findUniqueOrThrow({
        where: {
            id,
            isDeleted: false,
        },
    });

    await prisma.$transaction(async (transactionClient) => {
        // Step 1: Update doctor basic data
        if (Object.keys(doctorData).length > 0) {
            await transactionClient.doctor.update({
                where: {
                    id,
                },
                data: doctorData,
            });
        }

        // Step 2: Remove specialties if provided
        if (
            removeSpecialties &&
            Array.isArray(removeSpecialties) &&
            removeSpecialties.length > 0
        ) {
            // Validate that specialties to remove exist for this doctor
            const existingDoctorSpecialties =
                await transactionClient.doctorSpecialties.findMany({
                    where: {
                        doctorId: doctorInfo.id,
                        specialitiesId: {
                            in: removeSpecialties,
                        },
                    },
                });

            if (existingDoctorSpecialties.length !== removeSpecialties.length) {
                const foundIds = existingDoctorSpecialties.map(
                    (ds) => ds.specialitiesId
                );
                const notFound = removeSpecialties.filter(
                    (id) => !foundIds.includes(id)
                );
                throw new Error(
                    `Cannot remove non-existent specialties: ${notFound.join(", ")}`
                );
            }

            // Delete the specialties
            await transactionClient.doctorSpecialties.deleteMany({
                where: {
                    doctorId: doctorInfo.id,
                    specialitiesId: {
                        in: removeSpecialties,
                    },
                },
            });
        }

        // Step 3: Add new specialties if provided
        if (specialties && Array.isArray(specialties) && specialties.length > 0) {
            // Verify all specialties exist in Specialties table
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

            // Check for duplicates - don't add specialties that already exist
            const currentDoctorSpecialties =
                await transactionClient.doctorSpecialties.findMany({
                    where: {
                        doctorId: doctorInfo.id,
                        specialitiesId: {
                            in: specialties,
                        },
                    },
                    select: {
                        specialitiesId: true,
                    },
                });

            const currentSpecialtyIds = currentDoctorSpecialties.map(
                (ds) => ds.specialitiesId
            );
            const newSpecialties = specialties.filter(
                (id) => !currentSpecialtyIds.includes(id)
            );

            // Only create new specialties that don't already exist
            if (newSpecialties.length > 0) {
                const doctorSpecialtiesData = newSpecialties.map((specialtyId) => ({
                    doctorId: doctorInfo.id,
                    specialitiesId: specialtyId,
                }));

                await transactionClient.doctorSpecialties.createMany({
                    data: doctorSpecialtiesData,
                });
            }
        }
    });

    // Step 4: Return updated doctor with specialties
    const result = await prisma.doctor.findUnique({
        where: {
            id: doctorInfo.id,
        },
        include: {
            doctorSpecialties: {
                include: {
                    specialities: true,
                },
            },
        },
    });

    return result;
};

const deleteFromDB = async (id: string): Promise<Doctor> => {
    return await prisma.$transaction(async (transactionClient) => {
        const deleteDoctor = await transactionClient.doctor.delete({
            where: {
                id,
            },
        });

        await transactionClient.user.delete({
            where: {
                email: deleteDoctor.email,
            },
        });

        return deleteDoctor;
    });
};

const softDelete = async (id: string): Promise<Doctor> => {
    return await prisma.$transaction(async (transactionClient) => {
        const deleteDoctor = await transactionClient.doctor.update({
            where: { id },
            data: {
                isDeleted: true,
            },
        });

        await transactionClient.user.update({
            where: {
                email: deleteDoctor.email,
            },
            data: {
                status: UserStatus.DELETED,
            },
        });

        return deleteDoctor;
    });
};

type PatientInput = {
    symptoms: string;
};

const getAISuggestion = async (input: PatientInput) => {
    const doctors = await prisma.doctor.findMany({
        where: { isDeleted: false },
        include: {
            doctorSpecialties: {
                include: { specialities: true },
            },
            // review: { select: { rating: true } },
            reviews: { select: { rating: true } },
        },
    });

    const systemMessage = {
        role: "system",
        content:
            "You are a medical recommendation assistant. Based on a patient's symptoms and doctor data including specialties and reviews, suggest the top 5 most suitable doctors return the doctors in an array with the whole data object.",
    };

    const userMessage = {
        role: "user",
        content: `
Patient Symptoms: ${input.symptoms}

Here is the list of available doctors (JSON):
${JSON.stringify(doctors)}

Instructions:
1. Analyze patient symptoms.
2. Determine most relevant specialty.
3. Pick top 5 doctors from that specialty or pick the available even if less than 5.
4. If no doctors found, return an empty array or any other doctor.
5. Prioritize based on highest ratings.
6. Return an array of doctor objects ONLY in valid JSON format.
7. Each doctor object must contain these keys: id, name, specialty, experience, averageRating, appointmentFee.

Respond ONLY with the JSON array. No extra text or explanation.
`,
    };

    const response = await askOpenRouter([systemMessage, userMessage]);
    const cleanedJson = response
        .replace(/```(?:json)?\s*/, "") // remove ``` or ```json
        .replace(/```$/, "") // remove ending ```
        .trim();

    const suggestedDoctors = JSON.parse(cleanedJson);
    return suggestedDoctors;
};

const getAllPublic = async (
    filters: IDoctorFilterRequest,
    options: IPaginationOptions
) => {
    const { limit, page, skip } = paginationHelper.calculatePagination(options);
    const { searchTerm, specialties, ...filterData } = filters;

    const andConditions: Prisma.DoctorWhereInput[] = [];

    if (searchTerm) {
        andConditions.push({
            OR: doctorSearchableFields.map((field) => ({
                [field]: {
                    contains: searchTerm,
                    mode: "insensitive",
                },
            })),
        });
    }

    // Handle multiple specialties: ?specialties=Cardiology&specialties=Neurology
    if (specialties && specialties.length > 0) {
        // Convert to array if single string
        const specialtiesArray = Array.isArray(specialties) ? specialties : [specialties];

        andConditions.push({
            doctorSpecialties: {
                some: {
                    specialities: {
                        title: {
                            in: specialtiesArray,
                            mode: "insensitive",
                        },
                    },
                },
            },
        });
    }

    if (Object.keys(filterData).length > 0) {
        const filterConditions = Object.keys(filterData).map((key) => ({
            [key]: {
                equals: (filterData as any)[key],
            },
        }));
        andConditions.push(...filterConditions);
    }

    andConditions.push({
        isDeleted: false,
    });

    const whereConditions: Prisma.DoctorWhereInput =
        andConditions.length > 0 ? { AND: andConditions } : {};

    const result = await prisma.doctor.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy:
            options.sortBy && options.sortOrder
                ? { [options.sortBy]: options.sortOrder }
                : { averageRating: "desc" },
        select: {
            id: true,
            name: true,
            // email: false, // Hide email in public API
            profilePhoto: true,
            contactNumber: true,
            address: true,
            registrationNumber: true,
            experience: true,
            gender: true,
            appointmentFee: true,
            qualification: true,
            currentWorkingPlace: true,
            designation: true,
            averageRating: true,
            createdAt: true,
            updatedAt: true,
            doctorSpecialties: {
                include: {
                    specialities: true,
                },
            },
            // review: {
            reviews: {
                select: {
                    rating: true,
                    comment: true,
                    createdAt: true,
                    patient: {
                        select: {
                            name: true,
                            profilePhoto: true,
                        },
                    },
                },
            },
        },
    });

    const total = await prisma.doctor.count({
        where: whereConditions,
    });

    return {
        meta: {
            total,
            page,
            limit,
        },
        data: result,
    };
};

export const DoctorService = {
    updateIntoDB,
    getAllFromDB,
    getByIdFromDB,
    deleteFromDB,
    softDelete,
    getAISuggestion,
    getAllPublic,
};




















// import { Doctor, Prisma, UserStatus } from "@prisma/client";
// import { IOptions, paginationHelper } from "../../helper/paginationHelper";
// import { doctorSearchableFields } from "./doctor.constant";
// import { prisma } from "../../shared/prisma";
// import { IDoctorUpdateInput } from "./doctor.interface";
// import ApiError from "../../errors/ApiError";
// import httpStatus from 'http-status';
// import { openai } from "../../helper/open-router";
// import { extractJsonFromMessage } from "../../helper/extractJsonFromMessage";

// const getAllFromDB = async (filters: any, options: IOptions) => {
//     const { page, limit, skip, sortBy, sortOrder } = paginationHelper.calculatePagination(options);
//     const { searchTerm, specialties, ...filterData } = filters;

//     // console.log({ page, limit, skip, sortBy, sortOrder });

//     const andConditions: Prisma.DoctorWhereInput[] = [];

//     if (searchTerm) {
//         andConditions.push({
//             OR: doctorSearchableFields.map((field) => ({
//                 [field]: {
//                     contains: searchTerm,
//                     mode: "insensitive"
//                 }
//             }))
//         })
//     }

//     // "", "medicine"
//     if (specialties && specialties.length > 0) {
//         andConditions.push({
//             doctorSpecialties: {
//                 some: {
//                     specialities: {
//                         title: {
//                             contains: specialties,
//                             mode: "insensitive"
//                         }
//                     }
//                 }
//             }
//         })
//     }

//     if (Object.keys(filterData).length > 0) {
//         const filterConditions = Object.keys(filterData).map((key) => ({
//             [key]: {
//                 equals: (filterData as any)[key]
//             }
//         }))

//         andConditions.push(...filterConditions)
//     }

//     const whereConditions: Prisma.DoctorWhereInput = andConditions.length > 0 ? { AND: andConditions } : {};

//     const result = await prisma.doctor.findMany({
//         where: whereConditions,
//         skip,
//         take: limit,
//         orderBy: {
//             [sortBy]: sortOrder
//         },
//         include: {
//             doctorSpecialties: {
//                 include: {
//                     specialities: true
//                 }
//             },
//             reviews: {
//                 select: {
//                     rating: true,
//                     // comment: true
//                 }
//             }
//         }
//     });

//     const total = await prisma.doctor.count({
//         where: whereConditions
//     })

//     return {
//         meta: {
//             total,
//             page,
//             limit
//         },
//         data: result
//     }
// }

// const updateIntoDB = async (id: string, payload: Partial<IDoctorUpdateInput>) => {
//     const doctorInfo = await prisma.doctor.findUniqueOrThrow({
//         where: {
//             id
//         }
//     });

//     const { specialties, ...doctorData } = payload;

//     // eki sathe onokgolo query use hoyse ( getAllFromDB, updateIntoDB,, etc.) ei jonno transaction use kora hoyse,, (.tnx er jaigai age "prisma" silo)
//     return await prisma.$transaction(async (tnx) => {
//         if (specialties && specialties.length > 0) {
//             const deleteSpecialtyIds = specialties.filter((specialty) => specialty.isDeleted);

//             for (const specialty of deleteSpecialtyIds) {
//                 await tnx.doctorSpecialties.deleteMany({
//                     where: {
//                         doctorId: id,
//                         specialitiesId: specialty.specialtyId
//                     }
//                 })
//             }

//             const createSpecialtyIds = specialties.filter((specialty) => !specialty.isDeleted);

//             for (const specialty of createSpecialtyIds) {
//                 await tnx.doctorSpecialties.create({
//                     data: {
//                         doctorId: id,
//                         specialitiesId: specialty.specialtyId
//                     }
//                 })
//             }

//         }

//         const updatedData = await tnx.doctor.update({
//             where: {
//                 id: doctorInfo.id
//             },
//             data: doctorData,
//             include: {
//                 doctorSpecialties: {
//                     include: {
//                         specialities: true
//                     }
//                 }
//             }

//             //  doctor - doctorSpecailties - specialities
//         })

//         return updatedData
//     })


// }

// const getByIdFromDB = async (id: string): Promise<Doctor | null> => {
//     const result = await prisma.doctor.findUnique({
//         where: {
//             id,
//             isDeleted: false,
//         },
//         include: {
//             doctorSpecialties: {
//                 include: {
//                     specialities: true,
//                 },
//             },
//             doctorSchedules: {
//                 include: {
//                     schedule: true
//                 }
//             },
//             reviews: true
//         },
//     });
//     return result;
// };

// const deleteFromDB = async (id: string): Promise<Doctor> => {
//     return await prisma.$transaction(async (transactionClient) => {
//         const deleteDoctor = await transactionClient.doctor.delete({
//             where: {
//                 id,
//             },
//         });

//         await transactionClient.user.delete({
//             where: {
//                 email: deleteDoctor.email,
//             },
//         });

//         return deleteDoctor;
//     });
// };

// const softDelete = async (id: string): Promise<Doctor> => {
//     return await prisma.$transaction(async (transactionClient) => {
//         const deleteDoctor = await transactionClient.doctor.update({
//             where: { id },
//             data: {
//                 isDeleted: true,
//             },
//         });

//         await transactionClient.user.update({
//             where: {
//                 email: deleteDoctor.email,
//             },
//             data: {
//                 status: UserStatus.DELETED,
//             },
//         });

//         return deleteDoctor;
//     });
// };

// const getAISuggestions = async (payload: { symptoms: string }) => {
//     if (!(payload && payload.symptoms)) {
//         throw new ApiError(httpStatus.BAD_REQUEST, "symptoms is required!")
//     };

//     const doctors = await prisma.doctor.findMany({
//         where: { isDeleted: false },
//         include: {
//             doctorSpecialties: {
//                 include: {
//                     specialities: true
//                 }
//             }
//         }
//     });

//     console.log("doctors data loaded.......\n");
//     const prompt = `
// You are a medical assistant AI. Based on the patient's symptoms, suggest the top 3 most suitable doctors.
// Each doctor has specialties and years of experience.
// Only suggest doctors who are relevant to the given symptoms.

// Symptoms: ${payload.symptoms}

// Here is the doctor list (in JSON):
// ${JSON.stringify(doctors, null, 2)}

// Return your response in JSON format with full individual doctor data.
// `;

//     console.log("analyzing......\n")
//     const completion = await openai.chat.completions.create({
//         model: 'z-ai/glm-4.5-air:free',
//         messages: [
//             {
//                 role: "system",
//                 content:
//                     "You are a helpful AI medical assistant that provides doctor suggestions.",
//             },
//             {
//                 role: 'user',
//                 content: prompt,
//             },
//         ],
//     });

//     console.log(completion.choices[0].message);

//     const result = await extractJsonFromMessage(completion.choices[0].message)
//     return result;
// }


// export const DoctorService = {
//     getAllFromDB,
//     updateIntoDB,
//     getByIdFromDB,
//     deleteFromDB,
//     softDelete,
//     getAISuggestions
// }