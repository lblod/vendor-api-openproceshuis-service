import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import {
  impersonateAsBestuurseenheid,
  isValidBestuurseenheid,
} from '../controller/impersonate';
import { authenticateBeforeAction } from '../controller/auth';
import { sparqlEscapeUri } from 'mu';
import { createError } from '../controller/error';

export const impersonateRouter = Router();

impersonateRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionUri } = await authenticateBeforeAction(req);
    const actOnBehalfOfUri = req.body.bestuurseenheidUri;
    if (!(await isValidBestuurseenheid(actOnBehalfOfUri))) {
      throw new HttpError(
        'Cannot act on behalf of passed on bestuurseenheidUri.',
        400,
        `Passed on bestuurseenheidUri is not valid, cannot act on behalf of ${sparqlEscapeUri(actOnBehalfOfUri)}.`,
      );
    }
    await impersonateAsBestuurseenheid(sessionUri, actOnBehalfOfUri);

    return res.status(201).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    await createError(errorResponse.title, errorResponse.description);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
