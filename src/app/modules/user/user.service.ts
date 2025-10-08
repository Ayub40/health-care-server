// import { Request } from "express";
import { prisma } from "../../shared/prisma";
import bcrypt from "bcryptjs";
import { createPatientInput } from "./user.interface";
// import { fileUploader } from "../../helper/fileUploader";

const createPatient = async (payload: createPatientInput) => {
    const hashPassword = await bcrypt.hash(payload.password, 10);

    // multiple kaj korte "$transaction" use korte hoy,, ekhane user and patient create kora hoyse
    const result = await prisma.$transaction(async (tnx) => {
        await tnx.user.create({
            data: {
                email: payload.email,
                password: hashPassword
            }
        });

        return await tnx.patient.create({
            data: {
                name: payload.name,
                email: payload.email
            }
        })
    })

    return result;
}

// const createPatient = async (req: Request) => {

//     // if (req.file) {
//     //     const uploadResult = await fileUploader.uploadToCloudinary(req.file)
//     //     req.body.patient.profilePhoto = uploadResult?.secure_url
//     // }

//     const hashPassword = await bcrypt.hash(req.body.password, 10);

//     // multiple kaj korte "$transaction" use korte hoy,, ekhane user and patient create kora hoyse
//     const result = await prisma.$transaction(async (tnx) => {
//         await tnx.user.create({
//             data: {
//                 // email: req.body.patient.email,
//                 email: payload.email,
//                 password: hashPassword
//             }
//         });

//         return await tnx.patient.create({
//             data: req.body.patient
//         })
//     })

//     return result;
// }

export const UserService = {
    createPatient
}