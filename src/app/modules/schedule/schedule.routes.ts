import express from "express";
import { ScheduleController } from "./schedule.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get(
    "/",
    auth(UserRole.DOCTOR, UserRole.DOCTOR),
    ScheduleController.schedulesForDoctor
)

router.post(
    "/",
    ScheduleController.insertIntoDB
)

router.delete(
    // ekhane ("/:id" deoa hoyse,, tai controller file eoo "id" name dite hobe)
    "/:id",
    ScheduleController.deleteScheduleFromDB
)


export const ScheduleRoutes = router;