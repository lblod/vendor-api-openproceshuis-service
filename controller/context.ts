import jsonld from 'jsonld';
import { sparqlEscapeUri, query } from 'mu';
import { Request } from 'express';

import { log } from '../util/logger';
import { HttpError } from '../util/http-error';
import isUrl from '../util/is-url';
import { enrichRequestBodyWithContext } from './request';

export async function validateRequestBodyAgainstContext(
  req: Request,
): Promise<void> {
  const enrichedBody = enrichRequestBodyWithContext(req);
  const ldMainNode = await requestBodyToLd(enrichedBody);
  const resource = {
    uri: ldMainNode['@id'],
    typeUri: ldMainNode['@type'][0],
  };
  const foundTypeForResourceUri = await getResourceTypeUri(resource.uri);
  if (foundTypeForResourceUri && foundTypeForResourceUri !== resource.typeUri) {
    throw new HttpError(
      'Resource already exists with different type.',
      400,
      'The resourceUri does not match the expected type.',
      {
        resource: resource.uri,
        expectedType: resource.typeUri,
        foundType: foundTypeForResourceUri,
      },
    );
  }
  Object.keys(ldMainNode).map((key) => {
    if (['@id', '@reverse', '@type'].includes(key)) {
      return;
    }
    ldMainNode[key].map(
      (prop: { '@id'?: string; '@type'?: string; '@value'?: string }) => {
        const uriObjectValue = prop['@id'];
        if (uriObjectValue && !isUrl(uriObjectValue)) {
          throw new HttpError(
            'Predicate value is not a uri.',
            400,
            'Provided value for predicate must be an uri.',
            {
              predicate: key,
              object: uriObjectValue,
            },
          );
        }
        const objectValue = prop['@value'];
        const objectValueType = prop['@type'];
        if (objectValue && objectValueType) {
          const typeCheck = {
            'http://www.w3.org/2001/XMLSchema#string': () =>
              typeof objectValue === 'string',
            'http://www.w3.org/2001/XMLSchema#integer': () =>
              Boolean(parseInt(objectValue)),
            'http://www.w3.org/2001/XMLSchema#boolean': () =>
              Boolean(
                ['true', 'false'].includes(`${objectValue}`.toLowerCase()),
              ),
          };
          if (!typeCheck[objectValueType]()) {
            throw new HttpError(
              'Predicate value is not of type',
              400,
              'Provided value for predicate does not match expected type.',
              {
                predicate: key,
                object: objectValue,
                datatype: objectValueType,
              },
            );
          }
        }
      },
    );
  });
}

function prepareForExpansion(data: any) {
  const result = { ...data };
  Object.keys(result).forEach((key) => {
    const value = result[key];
    if (value === null || (Array.isArray(value) && value.length === 0)) {
      delete result[key];
    }
  });
  return result;
}

async function requestBodyToLd(enrichedBody: object): Promise<object> {
  const context = enrichedBody['@context'];
  delete enrichedBody['@context'];
  const cleanData = prepareForExpansion(enrichedBody);
  try {
    const expanded = await jsonld.expand({
      ...cleanData,
      '@context': context,
    });

    if (expanded.length === 0) {
      throw new Error('Invalid JSON-LD: Expansion resulted in an empty graph.');
    }

    const mainNode = expanded[0];
    log.debug(
      'Validation passed: Node with linked data for given request body.',
      mainNode,
    );
    return mainNode;
  } catch (error) {
    log.debug('Validation Failed.', error);
  }
}

async function getResourceTypeUri(
  resourceUri: string,
): Promise<string | undefined> {
  const sparqlResult = await query(
    `
    SELECT ?type
    WHERE {
      ${sparqlEscapeUri(resourceUri)} a ?type .
    } LIMIT 1 
    `,
    { sudo: true },
  );

  return sparqlResult.results.bindings?.[0]?.type.value;
}
