import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { hasValidSession } from '../controller/auth';

export const authRouter = Router();

authRouter.get(
  '/has-validated-session',
  async (req: Request, res: Response) => {
    try {
      const isSessionValid = await hasValidSession(req);

      return res.status(200).send({ isValid: isSessionValid });
    } catch (error) {
      const errorResponse = HttpError.caughtErrorJsonResponse(error);
      return res.status(errorResponse.status).send(errorResponse);
    }
  },
);
