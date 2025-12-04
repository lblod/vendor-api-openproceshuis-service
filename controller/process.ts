import { Request } from 'express';

import { HttpError } from '../util/http-error';
import isUrl from '../util/is-url';

export function createPostProcessRequest(request: Request) {
  const id = request.body['@id'];
  const {
    title = null,
    linkedInventoryProcess = null,
    users = null,
    diagrams = null,
    attachments = null,
  } = request.body;

  if (!id) {
    throw new HttpError(
      'Property "@id" is required in the body.',
      400,
      'When creating a process the "@id" property must be in the request body.',
    );
  }
  if (!title) {
    throw new HttpError(
      'Property "title" is required in the body.',
      400,
      'When creating a process the "title" property must be in the request body.',
    );
  }
  if (
    typeof linkedInventoryProcess == 'string' &&
    !isUrl(linkedInventoryProcess)
  ) {
    throw new HttpError(
      'Property "linkedInventoryProcess" must be an URI',
      400,
      'The "linkedInventoryProcess" property must be the URI of the inventory process subject.',
    );
  }
  if (typeof users !== 'object' && !Array.isArray(users)) {
    throw new HttpError(
      'Property "users" must be an array',
      400,
      'The "user" property must be an array of administrative unit uris so we can see who is working with this process.',
    );
  }
  if (typeof diagrams !== 'object' && !Array.isArray(diagrams)) {
    throw new HttpError(
      'Property "diagrams" must be an array',
      400,
      'The "diagrams" property must be an array of file uris.',
    );
  }
  if (typeof attachments !== 'object' && !Array.isArray(attachments)) {
    throw new HttpError(
      'Property "attachments" must be an array',
      400,
      'The "attachments" property must be an array of file uris.',
    );
  }

  return {
    '@id': id,
    title: title,
    description: request.body['description'],
    contact: request.body['contact'],
    linkedInventoryProcess: linkedInventoryProcess,
    users,
    diagrams,
    attachments,
  };
}
