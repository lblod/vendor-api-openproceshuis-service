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
  countOfCurrentDiagramListsOnProcess,
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
import { EnrichedBody } from '../types';
import { versionCurrentProcessWithUri } from '../controller/process-versioning';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  const { bestuursEenheid, sessionUri } = await authenticateBeforeAction(req);

  errorOnCustomContextInRequest(req);
  const resourceUri = errorOnResourceUriMissingInRequest(req);
  validatePostProcessRequestBody(req);

  const enrichedBody = enrichRequestBodyWithContext(req, {
    versionNumberForDiagramList: 0,
  });
  const expandedLd = await getExpandedRequestBody(enrichedBody);

  await validateRequestBodyAgainstExpandedLd(expandedLd);

  const requestInsertDataTriples =
    await getQuadInsertDataFromRequestBody(enrichedBody);

  const vendorUri = await getVendorUriFromSession(sessionUri);
  const processUri = await createNewProcess(
    resourceUri,
    bestuursEenheid,
    vendorUri,
    requestInsertDataTriples,
  );

  await versionCurrentProcessWithUri(processUri);

  return res.status(201).send({ '@id': processUri });
});

processRouter.patch('/', async (req: Request, res: Response) => {
  const { sessionUri } = await authenticateBeforeAction(req);

  errorOnCustomContextInRequest(req);
  const resourceUri = errorOnResourceUriMissingInRequest(req);
  const vendorUri = await getVendorUriFromSession(sessionUri);
  await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

  validatePatchProcessRequestBody(req);

  const currentDiagramListCount =
    await countOfCurrentDiagramListsOnProcess(resourceUri);
  const enrichedBody = enrichRequestBodyWithContext(req, {
    versionNumberForDiagramList: currentDiagramListCount + 1,
  });
  const expandedLd = await getExpandedRequestBody(enrichedBody);

  await validateRequestBodyAgainstExpandedLd(expandedLd);

  const requestInsertDataTriples =
    await getQuadInsertDataFromRequestBody(enrichedBody);

  const deleteEnrichedBody = {} as EnrichedBody;
  Object.assign(deleteEnrichedBody, enrichedBody);
  delete deleteEnrichedBody['diagrams'];
  const requestDeleteDataTriples =
    await getQuadDeleteDataFromRequestBody(deleteEnrichedBody);

  await updateProcess(
    resourceUri,
    requestInsertDataTriples,
    requestDeleteDataTriples,
  );

  await versionCurrentProcessWithUri(resourceUri);

  return res.status(200).send();
});

processRouter.put('/', async (req: Request, res: Response) => {
  const { sessionUri } = await authenticateBeforeAction(req);

  errorOnCustomContextInRequest(req);
  const resourceUri = errorOnResourceUriMissingInRequest(req);
  const vendorUri = await getVendorUriFromSession(sessionUri);
  await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

  validatePutProcessRequestBody(req);

  const currentDiagramListCount =
    await countOfCurrentDiagramListsOnProcess(resourceUri);
  const enrichedBody = enrichRequestBodyWithContext(req, {
    versionNumberForDiagramList: currentDiagramListCount + 1,
  });
  const expandedLd = await getExpandedRequestBody(enrichedBody);

  await validateRequestBodyAgainstExpandedLd(expandedLd);

  const requestInsertDataTriples =
    await getQuadInsertDataFromRequestBody(enrichedBody);

  const deleteEnrichedBody = {} as EnrichedBody;
  Object.assign(deleteEnrichedBody, enrichedBody);
  delete deleteEnrichedBody['diagrams'];
  const requestDeleteDataTriples =
    await getQuadDeleteDataFromRequestBody(deleteEnrichedBody);

  await updateProcess(
    resourceUri,
    requestInsertDataTriples,
    requestDeleteDataTriples,
  );

  await versionCurrentProcessWithUri(resourceUri);

  return res.status(200).send();
});

processRouter.delete('/', async (req: Request, res: Response) => {
  const { sessionUri } = await authenticateBeforeAction(req);

  const resourceUri = errorOnResourceUriMissingInRequest(req);
  const vendorUri = await getVendorUriFromSession(sessionUri);
  await errorOnProcessNotOwnedByVendor(resourceUri, vendorUri);

  await archiveProcess(resourceUri);

  await versionCurrentProcessWithUri(resourceUri);

  return res.status(204).send();
});

processRouter.delete('/files', async (req: Request, res: Response) => {
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

  await versionCurrentProcessWithUri(resourceUri);

  return res.status(204).send();
});
