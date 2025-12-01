import Router from 'express-promise-router';

import { Request, Response } from 'express';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    return res.status(201).send();
  } catch (error) {
    const message =
      error.message ?? 'An error occurred while creating a new process';
    const statusCode = error.status ?? 500;
    return res.status(statusCode).send({ message });
  }
});
