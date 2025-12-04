import { Request } from 'express';

import { HttpError } from '../util/http-error';

export function createPostProcessRequest(request: Request) {
  if (!request.body?.['@id']) {
    throw new HttpError(
      'Property "@id" is required in the body.',
      400,
      'When creating a process the "@id" property must be in the request body.',
    );
  }
  if (!request.body?.['title']) {
    throw new HttpError(
      'Property "title" is required in the body.',
      400,
      'When creating a process the "title" property must be in the request body.',
    );
  }
  if ('users' in request.body && !Array.isArray(request.body?.['users'])) {
    throw new HttpError(
      'Property "users" must be an array',
      400,
      'The "user" property must be an array of administrative unit uris so we can see who is working with this process.',
    );
  }
  if (
    'diagrams' in request.body &&
    !Array.isArray(request.body?.['diagrams'])
  ) {
    throw new HttpError(
      'Property "diagrams" must be an array',
      400,
      'The "diagrams" property must be an array of file uris.',
    );
  }
  if (
    'attachments' in request.body &&
    !Array.isArray(request.body?.['attachments'])
  ) {
    throw new HttpError(
      'Property "attachments" must be an array',
      400,
      'The "attachments" property must be an array of file uris.',
    );
  }

  return {
    '@id': request.body['@id'],
    title: request.body['title'],
    description: request.body['description'],
    contact: request.body['contact'],
    linkedInventoryProcess: request.body['linkedInventoryProcess'],
    users: request.body['users'],
    diagrams: request.body['diagrams'],
    attachments: request.body['attachments'],
  };
}
