import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { authenticateBeforeAction } from '../controller/auth';
import {
  archiveProcess,
  createNewProcess,
  createPatchProcessRequest,
  createPostProcessRequest,
  createPutProcessRequest,
  patchProcess,
  putProcess,
  removeFileFromProcess,
} from '../controller/process';
import isUrl from '../util/is-url';
import { getVendorUriFromSession } from '../controller/impersonate';
import {
  enrichRequestBodyWithContext,
  errorOnResourceUriMissingInRequest,
} from '../controller/request';
import {
  getRequestBodyAsLinkedData,
  validateRequestBodyAgainstContext,
} from '../controller/context';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { bestuursEenheid, sessionUri } = await authenticateBeforeAction(req);

    errorOnResourceUriMissingInRequest(req);
    const enrichedRequestBody = await enrichRequestBodyWithContext(req);
    const requestDataAsLd =
      await getRequestBodyAsLinkedData(enrichedRequestBody);
    await validateRequestBodyAgainstContext(requestDataAsLd);

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
    const { sessionUri } = await authenticateBeforeAction(req);

    errorOnResourceUriMissingInRequest(req);
    const enrichedRequestBody = await enrichRequestBodyWithContext(req);
    const requestDataAsLd =
      await getRequestBodyAsLinkedData(enrichedRequestBody);
    await validateRequestBodyAgainstContext(requestDataAsLd);

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
    const { sessionUri } = await authenticateBeforeAction(req);

    errorOnResourceUriMissingInRequest(req);
    const enrichedRequestBody = await enrichRequestBodyWithContext(req);
    const requestDataAsLd =
      await getRequestBodyAsLinkedData(enrichedRequestBody);
    await validateRequestBodyAgainstContext(requestDataAsLd);

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
    const { sessionUri } = await authenticateBeforeAction(req);
    errorOnResourceUriMissingInRequest(req);

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
    await authenticateBeforeAction(req);

    errorOnResourceUriMissingInRequest(req);
    const fileUri = req.body['fileUri'];
    if (!fileUri || fileUri.trim() == '' || !isUrl(fileUri)) {
      throw new HttpError(
        'Property "fileUri" is not set',
        400,
        'Property "fileUri" must be set when you want to remove a file from the process.',
      );
    }
    await removeFileFromProcess(req.body['@id'], fileUri);

    return res.status(204).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
