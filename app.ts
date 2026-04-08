import { app } from 'mu';

import express, { Request, ErrorRequestHandler } from 'express';
import bodyParser from 'body-parser';

import { authRouter } from './router/auth';
import { processRouter } from './router/process';
import { impersonateRouter } from './router/impersonate';
import { HttpError } from './util/http-error';
import { pino } from './util/logger';
import { handleErrorForMonitoring } from './controller/error';

app.use(pino);
app.use(
  bodyParser.json({
    limit: '500mb',
    type: function (req: Request) {
      return /^application\/json/.test(req.get('content-type') as string);
    },
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use('/auth', authRouter);
app.use('/act-on-behalf-of', impersonateRouter);
app.use('/processes', processRouter);
app.get('/health-check', (req: Request, res: Response) => {
  res.send({ status: 'ok' });
});

const errorHandler: ErrorRequestHandler = async function (
  err,
  _req,
  res,
  _next,
) {
  const errorResponse = HttpError.caughtErrorJsonResponse(err);
  await handleErrorForMonitoring(
    errorResponse.status,
    errorResponse.title,
    errorResponse.description,
  );
  res.status(errorResponse.status);
  res.json({
    errors: [errorResponse],
  });
};

app.use(errorHandler);
