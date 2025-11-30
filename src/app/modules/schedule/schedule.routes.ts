import { UserRole } from '@prisma/client';
import express from 'express';
import auth from '../../middlewares/auth';
import { ScheduleController } from './schedule.controller';

const router = express.Router();

router.get(
    '/',
    auth(UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN),
    ScheduleController.getAllFromDB
);

/**
 * API ENDPOINT: /schedule/:id
 * 
 * Get schedule data by id
 */
router.get(
    '/:id',
    // auth(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.DOCTOR),
    auth(UserRole.DOCTOR, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PATIENT),
    ScheduleController.getByIdFromDB
);

router.post(
    '/',
    auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    ScheduleController.insertIntoDB
);



/**
 * API ENDPOINT: /schdeule/:id
 * 
 * Delete schedule data by id
 */
router.delete(
    '/:id',
    auth(UserRole.SUPER_ADMIN, UserRole.ADMIN),
    ScheduleController.deleteFromDB
);

export const ScheduleRoutes = router;










// import express from "express";
// import { ScheduleController } from "./schedule.controller";
// import auth from "../../middlewares/auth";
// import { UserRole } from "@prisma/client";

// const router = express.Router();

// router.get(
//     "/",
//     // auth(UserRole.DOCTOR, UserRole.DOCTOR),
//     auth(UserRole.DOCTOR, UserRole.ADMIN),
//     ScheduleController.schedulesForDoctor
// )

// router.post(
//     "/",
//     auth(UserRole.ADMIN),
//     ScheduleController.insertIntoDB
// )

// router.delete(
//     // ekhane ("/:id" deoa hoyse,, tai controller file eoo "id" name dite hobe)
//     "/:id",
//     auth(UserRole.ADMIN),
//     ScheduleController.deleteScheduleFromDB
// )

// router.delete(
//     "/",
//     auth(UserRole.ADMIN),
//     ScheduleController.deleteAllSchedules
// );

// export const ScheduleRoutes = router;