import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { authenticateBeforeAction } from '../controller/auht';
import { createPostProcessRequest } from '../controller/process';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    await authenticateBeforeAction(req);
    const createRequest = createPostProcessRequest(req);
    console.log({ createRequest });

    return res
      .status(201)
      .send({ '@id': 'http://data.lblod.info/processes/example-1' });
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
