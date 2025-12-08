import { app } from 'mu';

import express, { Request, ErrorRequestHandler } from 'express';
import bodyParser from 'body-parser';

import { processRouter } from './router/process';
import { impersonationRouter } from './router/impersonation';

import { HttpError } from './util/http-error';

app.use(
  bodyParser.json({
    limit: '500mb',
    type: function (req: Request) {
      return /^application\/json/.test(req.get('content-type') as string);
    },
  }),
);

app.use(express.urlencoded({ extended: true }));
app.use('/impersonation', impersonationRouter);
app.use('/processes', processRouter);
app.get('/health-check', (req: Request, res: Response) => {
  res.send({ status: 'ok' });
});

const errorHandler: ErrorRequestHandler = function (err, _req, res, _next) {
  const errorResponse = HttpError.caughtErrorJsonResponse(err);
  res.status(errorResponse.status);
  res.json({
    errors: [errorResponse],
  });
};

app.use(errorHandler);
