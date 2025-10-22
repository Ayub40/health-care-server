import express from 'express';
import { PatientController } from './patient.controller';

const router = express.Router();

router.get(
    '/',
    PatientController.getAllFromDB
);

export const PatientRoutes = router;