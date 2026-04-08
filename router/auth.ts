import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { hasValidSession } from '../controller/auth';
import { createError } from '../controller/error';

export const authRouter = Router();

authRouter.get('/has-valid-session', async (req: Request, res: Response) => {
  try {
    const isSessionValid = await hasValidSession(req);

    return res.status(200).send({ isValid: isSessionValid });
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    await createError(errorResponse.title, errorResponse.description);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
