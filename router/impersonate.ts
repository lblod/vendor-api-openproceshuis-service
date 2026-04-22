import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import {
  impersonateAsBestuurseenheid,
  isValidBestuurseenheid,
} from '../controller/impersonate';
import { authenticateBeforeAction } from '../controller/auth';
import { sparqlEscapeUri } from 'mu';

export const impersonateRouter = Router();

impersonateRouter.post('/', async (req: Request, res: Response) => {
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
});
