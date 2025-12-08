import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { authenticateBeforeAction } from '../controller/auht';
import {
  createNewProcess,
  createPostProcessRequest,
} from '../controller/process';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { bestuursEenheid } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'The bestuurseenheid must be set so we know where the process will live.',
      );
    }

    const createRequest = createPostProcessRequest(req);
    const processUri = await createNewProcess(createRequest, bestuursEenheid);

    return res.status(201).send({ '@id': processUri });
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
