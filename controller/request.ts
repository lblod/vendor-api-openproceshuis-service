import { Request } from 'express';

import { HttpError } from '../util/http-error';
import { log } from '../util/logger';
import { processContext } from '../context';
import isUrl from '../util/is-url';
import isEmail from '../util/is-email';
import isMaxLength from '../util/is-max-length';

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

export function errorOnResourceUriMissingInRequest(request: Request): string {
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

  return uri;
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

const processResourceKeys = () => {
  const valueIsStringAndNotEmpty = (value: unknown) =>
    value && typeof value === 'string' && value.trim() !== '';
  const valueIsArrayOfUris = (value: unknown) =>
    Array.isArray(value) && value.every((uri: string) => isUrl(uri));

  const processKeys = {
    title: {
      validate: (value: any) =>
        valueIsStringAndNotEmpty(value) && !isMaxLength(value, 250),
      requiredValueAsString: 'a non-empty string, characters: 250',
    },
    description: {
      validate: (value: any) =>
        value === null ||
        (valueIsStringAndNotEmpty(value) && !isMaxLength(value, 1500)),
      requiredValueAsString: 'null or a non-empty string, characters: 1500',
    },
    email: {
      validate: (value: any) =>
        value === null || (valueIsStringAndNotEmpty(value) && isEmail(value)),
      requiredValueAsString: 'null or an email',
    },
    'linked-concept': {
      validate: (value: any) =>
        value === null || (valueIsStringAndNotEmpty(value) && isUrl(value)),
      requiredValueAsString: 'null or an uri',
    },
    diagrams: {
      validate: (value: any) => valueIsArrayOfUris(value),
      requiredValueAsString: 'an array of uris',
    },
    attachments: {
      validate: (value: any) => valueIsArrayOfUris(value),
      requiredValueAsString: 'an array of uris',
    },
    users: {
      validate: (value: any) => valueIsArrayOfUris(value),
      requiredValueAsString: 'an array of uris',
    },
  };

  return {
    keys: processKeys,
    isAllowed: (key: string) => key in processKeys,
    isValidKeyValue: (key: string, value: any) =>
      processKeys[key]?.validate(value),
    requiredValueType: (key: string) => processKeys[key]?.requiredValueAsString,
  };
};

function errorOnUseOfUnknownRequestBodyJsonKeys(request: Request) {
  const jsonKeysToIgnore = ['@id', '@context', 'type'];

  Object.keys(request.body)
    .filter((jsonKey) => !jsonKeysToIgnore.includes(jsonKey))
    .map((jsonKey) => {
      if (!processResourceKeys().isAllowed(jsonKey)) {
        throw new HttpError(
          `Property "${jsonKey}" is not allowed to be passed on to the request body.`,
          400,
          'Contact a maintainer if this property should be allowed.',
          {
            property: jsonKey,
          },
        );
      }
    });
}

export function validatePostProcessRequestBody(request: Request) {
  errorOnUseOfUnknownRequestBodyJsonKeys(request);

  const { title = null } = request.body;
  if (!title || !processResourceKeys().isValidKeyValue('title', title)) {
    throw new HttpError(
      'Property "title" is required in the body.',
      400,
      'Provide the "title" property as a non-empty string in the body.',
    );
  }
}

export function validatePatchProcessRequestBody(request: Request) {
  errorOnUseOfUnknownRequestBodyJsonKeys(request);
  Object.keys(processResourceKeys().keys).map((jsonKey) => {
    const keyValue = request.body[jsonKey] ?? null;
    if (
      jsonKey in request.body &&
      !processResourceKeys().isValidKeyValue(jsonKey, keyValue)
    ) {
      throw new HttpError(
        `Property "${jsonKey}" has an invalid value.`,
        400,
        `The value of "${jsonKey}" must be ${processResourceKeys().requiredValueType(jsonKey)}.`,
      );
    }
  });
}

export function validatePutProcessRequestBody(request: Request) {
  errorOnUseOfUnknownRequestBodyJsonKeys(request);
  Object.keys(processResourceKeys().keys).map((jsonKey) => {
    if (!(jsonKey in request.body)) {
      throw new HttpError(
        `Property "${jsonKey}" is required.`,
        400,
        `Property "${jsonKey}" is required in the request body.`,
      );
    }
    if (
      !processResourceKeys().isValidKeyValue(jsonKey, request.body[jsonKey])
    ) {
      throw new HttpError(
        `Property "${jsonKey}" has an invalid value.`,
        400,
        `The value of "${jsonKey}" must be ${processResourceKeys().requiredValueType(jsonKey)}.`,
      );
    }
  });
}
