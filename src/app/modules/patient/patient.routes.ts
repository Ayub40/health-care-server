import express from 'express';
import { PatientController } from './patient.controller';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';

const router = express.Router();

router.get(
    '/',
    PatientController.getAllFromDB
);

router.patch(
    '/',
    auth(UserRole.PATIENT),
    PatientController.updateIntoDB
);

export const PatientRoutes = router;