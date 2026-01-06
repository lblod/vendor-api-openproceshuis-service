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
import { addNewDiagramsToProcess } from '../controller/itemList';
import isUrl from '../util/is-url';

export const processRouter = Router();

processRouter.post('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { bestuursEenheid } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'The bestuurseenheid must be set so we know where the process will live.',
      );
    }

    const createRequest = createPostProcessRequest(req);
    const processUri = await createNewProcess(createRequest, bestuursEenheid);
    await addNewDiagramsToProcess(processUri, createRequest.diagrams);

    return res.status(201).send({ '@id': processUri });
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.patch('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { bestuursEenheid } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'The bestuurseenheid must be set so we know where the process will live.',
      );
    }

    const patchRequest = createPatchProcessRequest(req);
    await patchProcess(patchRequest);
    await addNewDiagramsToProcess(patchRequest['@id'], patchRequest.diagrams);

    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.put('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { bestuursEenheid } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'The bestuurseenheid must be set so we know where the process will live.',
      );
    }

    const putRequest = createPutProcessRequest(req);
    await putProcess(putRequest);
    await addNewDiagramsToProcess(putRequest['@id'], putRequest.diagrams);

    return res.status(200).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});

processRouter.delete('/', async (req: Request, res: Response) => {
  try {
    idMustBeInRequestBody(req);
    const { bestuursEenheid } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'The bestuurseenheid must be set so we know where the process will live.',
      );
    }

    await archiveProcess(req.body['@id']);

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
    const { bestuursEenheid } = await authenticateBeforeAction(req);
    if (!bestuursEenheid) {
      throw new HttpError(
        'No bestuurseenheid found for session',
        400,
        'The bestuurseenheid must be set so we know where the process will live.',
      );
    }

    await removeFileFromProcess(req.body['@id'], fileUri);

    return res.status(204).send();
  } catch (error) {
    const errorResponse = HttpError.caughtErrorJsonResponse(error);
    return res.status(errorResponse.status).send(errorResponse);
  }
});
