import express from "express";
import { ScheduleController } from "./schedule.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get(
    "/",
    // auth(UserRole.DOCTOR, UserRole.DOCTOR),
    auth(UserRole.DOCTOR, UserRole.ADMIN),
    ScheduleController.schedulesForDoctor
)

router.post(
    "/",
    auth(UserRole.ADMIN),
    ScheduleController.insertIntoDB
)

router.delete(
    // ekhane ("/:id" deoa hoyse,, tai controller file eoo "id" name dite hobe)
    "/:id",
    auth(UserRole.ADMIN),
    ScheduleController.deleteScheduleFromDB
)

router.delete(
    "/",
    auth(UserRole.ADMIN),
    ScheduleController.deleteAllSchedules
);

export const ScheduleRoutes = router;