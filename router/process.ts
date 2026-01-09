import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { authenticateBeforeAction } from '../controller/auht';
import {
  archiveProcess,
  createNewProcess,
  createPatchProcessRequest,
  createPostProcessRequest,
  createPutProcessRequest,
  idMustBeInRequestBody,
  patchProcess,
  putProcess,
  removeFileFromProcess,
} from '../controller/process';
import isUrl from '../util/is-url';
import { getVendorUriFromSession } from '../controller/impersonate';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { bestuursEenheid, sessionUri } = await authenticateBeforeAction(req);

    const createRequest = createPostProcessRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    const processUri = await createNewProcess(
      createRequest,
      bestuursEenheid,
      vendorUri,
    );

    return res.status(201).send({ '@id': processUri });
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.patch('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { sessionUri } = await authenticateBeforeAction(req);

    const patchRequest = createPatchProcessRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    await patchProcess(patchRequest, vendorUri);

    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.put('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { sessionUri } = await authenticateBeforeAction(req);

    const putRequest = createPutProcessRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    await putProcess(putRequest, vendorUri);

    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.delete('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { sessionUri } = await authenticateBeforeAction(req);

    const vendorUri = await getVendorUriFromSession(sessionUri);
    await archiveProcess(req.body['@id'], vendorUri);

    return res.status(204).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.delete('/files', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const fileUri = req.body['fileUri'];
    if (!fileUri || fileUri.trim() == '' || !isUrl(fileUri)) {
      throw new HttpError(
        'Property "fileUri" is not set',
        400,
        'Property "fileUri" must be set when you want to remove a file from the process.',
      );
    }
    await authenticateBeforeAction(req);
    await removeFileFromProcess(req.body['@id'], fileUri);

    return res.status(204).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
