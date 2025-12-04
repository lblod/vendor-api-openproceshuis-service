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
    await authenticateBeforeAction(req);
    const createRequest = createPostProcessRequest(req);
    const processUri = await createNewProcess(createRequest);

    return res.status(201).send({ '@id': processUri });
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
