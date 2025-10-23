import { UserRole } from '@prisma/client';
import express from 'express';
import auth from '../../middlewares/auth';
import { PrescriptionController } from './prescription.controller';
// import { PatientController } from '../patient/patient.controller';
const router = express.Router();


router.get(
    '/my-prescription',
    auth(UserRole.PATIENT),
    PrescriptionController.patientPrescription
)

router.post(
    "/",
    auth(UserRole.DOCTOR),
    PrescriptionController.createPrescription
);

// router.post(
//     "/",
//     auth(UserRole.DOCTOR),
//     PrescriptionController.createPrescription
// );

// router.get(
//     '/:id',
//     PatientController.getByIdFromDB
// );

export const PrescriptionRoutes = router;