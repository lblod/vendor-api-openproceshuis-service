import { Request } from 'express';

import { HttpError } from '../util/http-error';
import { log } from '../util/logger';
import { processContext } from '../context';

export function getSessionUriFromRequest(request: Request): string {
  const HEADER_MU_SESSION_ID = 'mu-session-id';
  const sessionUri = request.get(HEADER_MU_SESSION_ID);

  if (!sessionUri) {
    throw new HttpError(
      'Missing session header',
      400,
      `The session header '${HEADER_MU_SESSION_ID}' was not found in the request headers.`,
    );
  }
  log.debug('Found session in request', {
    session: sessionUri,
  });
  return sessionUri;
}

export function errorOnResourceUriMissingInRequest(request: Request): void {
  const uri = request.body['@id'];
  const isAvailable = uri && typeof uri == 'string' && uri.trim() !== '';

  if (!isAvailable) {
    throw new HttpError(
      'The resource uri must be set in the request body under property "@id".',
      400,
      'Without the @id we do not have enough context about the resource.',
    );
  }
  log.debug('Found resource uri in request', {
    resourceUri: uri,
  });
}

export function enrichRequestBodyWithContext(request: Request): any {
  const enrichedBody = request.body;
  if (!enrichedBody['@context']) {
    enrichedBody['@context'] = processContext;
  }
  if (!enrichedBody['type']) {
    enrichedBody['type'] = 'Process';
  }
  return enrichedBody;
}
