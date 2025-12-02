import Router from 'express-promise-router';

import { Request, Response } from 'express';
import { AuthRequest } from '../request/auth';
import { HttpError } from '../util/http-error';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    AuthRequest.fromRequest(req);
    return res.status(201).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
