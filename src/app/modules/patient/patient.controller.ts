import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../shared/catchAsync';
import { patientFilterableFields } from './patient.constant';
import pick from '../../helper/pick';
import { PatientService } from './patient.service';
import sendResponse from '../../shared/sendResponse';


const getAllFromDB = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, patientFilterableFields);
    const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

    const result = await PatientService.getAllFromDB(filters, options);

    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Patient retrieval successfully',
        meta: result.meta,
        data: result.data,
    });
});


export const PatientController = {
    getAllFromDB
};