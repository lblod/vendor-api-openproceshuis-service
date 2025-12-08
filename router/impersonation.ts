import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { authenticateBeforeAction } from '../controller/auht';
import { sparqlEscapeUri } from 'mu';
import isUrl from '../util/is-url';
import {
  configureActOnBehalf,
  removeActOnBehalf,
} from '../controller/impersonation';

export const impersonationRouter = Router();

impersonationRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { bestuursEenheid, sessionUri } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'Create a session through the m2m-login service.',
      );
    }
    const actOnBehalfOfUri = req.body['@id'];
    if (actOnBehalfOfUri && !isUrl(actOnBehalfOfUri)) {
      throw new HttpError(
        'Property "@id" must be a URI.',
        400,
        'The "@id" must be the uri of the administrative-unit you wan to act on behalf of.',
      );
    }
    console.log(
      `Vendor ${sparqlEscapeUri(bestuursEenheid.uri)} wants to act on behalf of ${sparqlEscapeUri(actOnBehalfOfUri)}`,
    );
    await configureActOnBehalf(sessionUri, actOnBehalfOfUri);
    return res.status(201).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

impersonationRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const { bestuursEenheid, sessionUri } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      return res.status(204).send();
    }
    await removeActOnBehalf(sessionUri);
    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
