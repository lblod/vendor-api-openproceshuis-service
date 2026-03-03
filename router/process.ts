import Router from 'express-promise-router';

import { Request, Response } from 'express';

import { HttpError } from '../util/http-error';
import { authenticateBeforeAction } from '../controller/auth';
import {
  archiveProcess,
  createNewProcess,
  updateProcess,
  removeFileFromProcess,
  errorOnProcessNotOwnedByVendor,
} from '../controller/process';
import isUrl from '../util/is-url';
import { getVendorUriFromSession } from '../controller/impersonate';
import {
  enrichRequestBodyWithContext,
  errorOnCustomContextInRequest,
  errorOnResourceUriMissingInRequest,
  validatePatchProcessRequestBody,
  validatePostProcessRequestBody,
  validatePutProcessRequestBody,
} from '../controller/request';
import {
  getExpandedRequestBody,
  getQuadDeleteDataFromRequestBody,
  getQuadInsertDataFromRequestBody,
  validateRequestBodyAgainstExpandedLd,
} from '../controller/context';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { bestuursEenheid, sessionUri } = await authenticateBeforeAction(req);

    errorOnCustomContextInRequest(req);
    const resourceUri = errorOnResourceUriMissingInRequest(req);
    validatePostProcessRequestBody(req);

    const expandedLd = await getExpandedRequestBody(
      enrichRequestBodyWithContext(req),
    );
    await validateRequestBodyAgainstExpandedLd(expandedLd);
    const requestInsertDataTriples = await getQuadInsertDataFromRequestBody(
      enrichRequestBodyWithContext(req),
    );

    const vendorUri = await getVendorUriFromSession(sessionUri);
    const processUri = await createNewProcess(
      resourceUri,
      bestuursEenheid,
      vendorUri,
      requestInsertDataTriples,
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

    errorOnCustomContextInRequest(req);
    const resourceUri = errorOnResourceUriMissingInRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

    validatePatchProcessRequestBody(req);

    const requestDataAsLd = await getExpandedRequestBody(
      enrichRequestBodyWithContext(req),
    );
    await validateRequestBodyAgainstExpandedLd(requestDataAsLd);
    const requestInsertDataTriples = await getQuadInsertDataFromRequestBody(
      enrichRequestBodyWithContext(req),
    );
    const requestDeleteDataTriples = await getQuadDeleteDataFromRequestBody(
      enrichRequestBodyWithContext(req),
    );

    await updateProcess(
      resourceUri,
      vendorUri,
      requestInsertDataTriples,
      requestDeleteDataTriples,
    );

    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.put('/', async (req: Request, res: Response) => {
  try {
    const { sessionUri } = await authenticateBeforeAction(req);

    errorOnCustomContextInRequest(req);
    const resourceUri = errorOnResourceUriMissingInRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

    validatePutProcessRequestBody(req);

    const requestDataAsLd = await getExpandedRequestBody(
      enrichRequestBodyWithContext(req),
    );
    await validateRequestBodyAgainstExpandedLd(requestDataAsLd);
    const requestInsertDataTriples = await getQuadInsertDataFromRequestBody(
      enrichRequestBodyWithContext(req),
    );
    const requestDeleteDataTriples = await getQuadDeleteDataFromRequestBody(
      enrichRequestBodyWithContext(req),
    );

    await updateProcess(
      resourceUri,
      vendorUri,
      requestInsertDataTriples,
      requestDeleteDataTriples,
    );

    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const { sessionUri } = await authenticateBeforeAction(req);

    const resourceUri = errorOnResourceUriMissingInRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

    await archiveProcess(resourceUri);

    return res.status(204).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.delete('/files', async (req: Request, res: Response) => {
  try {
    const { sessionUri } = await authenticateBeforeAction(req);

    const resourceUri = errorOnResourceUriMissingInRequest(req);
    const vendorUri = await getVendorUriFromSession(sessionUri);
    await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

    const fileUri = req.body['fileUri'];
    if (!fileUri || fileUri.trim() == '' || !isUrl(fileUri)) {
      throw new HttpError(
        'Property "fileUri" is not set',
        400,
        'Property "fileUri" must be set when you want to remove a file from the process.',
      );
    }
    await removeFileFromProcess(resourceUri, fileUri);

    return res.status(204).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
