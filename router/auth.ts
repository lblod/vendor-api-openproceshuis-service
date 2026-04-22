import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { hasValidSession } from '../controller/auth';

export const authRouter = Router();

authRouter.get('/has-valid-session', async (req: Request, res: Response) => {
  const isSessionValid = await hasValidSession(req);

  return res.status(200).send({ isValid: isSessionValid });
});
