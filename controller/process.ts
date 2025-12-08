import { Request } from 'express';

import { HttpError } from '../util/http-error';
import isUrl from '../util/is-url';
import { BestuursEenheid, CreateProcessRequest } from '../types';
import { sparqlEscapeUri, query, update, sparqlEscapeString } from 'mu';

export async function createNewProcess(
  process: CreateProcessRequest,
  bestuurseenheid: BestuursEenheid,
): Promise<string> {
  if (await isExistingProcessUri(process['@id'])) {
    throw new HttpError(
      'Process with uri already exists.',
      409,
      'The given uri for the process already exists in the database.',
    );
  }
  let description = '';
  let linkedInventoryProcess = '';
  let users = '';
  let diagrams = '';
  let attachments = '';

  if (process.description) {
    description = `${sparqlEscapeUri(process['@id'])} dct:description ${sparqlEscapeString(process.description)} .`;
  }
  if (process.linkedInventoryProcess) {
    linkedInventoryProcess = `${sparqlEscapeUri(process['@id'])} dct:source ${sparqlEscapeUri(process.linkedInventoryProcess)} .`;
  }
  if (process.users) {
    users = process.users
      .map(
        (uri) =>
          `${sparqlEscapeUri(process['@id'])} prov:usedBy ${sparqlEscapeUri(uri)} .`,
      )
      .join('\n');
  }
  if (process.diagrams) {
    diagrams = process.diagrams
      .map(
        (uri) =>
          `${sparqlEscapeUri(process['@id'])} nie:isPartOf ${sparqlEscapeUri(uri)} .`,
      )
      .join('\n');
  }
  if (process.attachments) {
    attachments = process.attachments
      .map(
        (uri) =>
          `${sparqlEscapeUri(process['@id'])} nie:isPartOf ${sparqlEscapeUri(uri)} .`,
      )
      .join('\n');
  }

  // TODO - make sure it is added in the correct graph, now its the sessions organization graph
  await update(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    INSERT DATA {
      GRAPH ${sparqlEscapeUri(bestuurseenheid.organizationGraphUri)} {
        ${sparqlEscapeUri(process['@id'])} a dpv:Process .
        ${sparqlEscapeUri(process['@id'])} dct:title ${sparqlEscapeString(process.title)} .
        ${sparqlEscapeUri(process['@id'])} dct:publisher ${sparqlEscapeUri(bestuurseenheid.uri)} .
        ${description}
        ${linkedInventoryProcess}
        ${users}
        ${diagrams}
        ${attachments}
      }
      GRAPH <http://mu.semte.ch/graphs/shared> {
        ${sparqlEscapeUri(process['@id'])} a dpv:Process .
        ${sparqlEscapeUri(process['@id'])} dct:title ${sparqlEscapeString(process.title)} .
        ${sparqlEscapeUri(process['@id'])} dct:publisher ${sparqlEscapeUri(bestuurseenheid.uri)} .
        ${description}
        ${linkedInventoryProcess}
        ${users}
        ${diagrams}
        ${attachments}
      }
    }  
  `,
    { sudo: false },
  );
  console.log(
    `Added process ${sparqlEscapeUri(process['@id'])} to bestuurseenheid ${sparqlEscapeUri(bestuurseenheid.uri)}.`,
  );

  return process['@id'];
}

export function createPostProcessRequest(
  request: Request,
): CreateProcessRequest {
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
  if (Array.isArray(users) && !users.every((uri: string) => isUrl(uri))) {
    throw new HttpError(
      'Values of "users" must all be URIs',
      400,
      'The "user" property must be an array of administrative unit uris. Example: ["http://data.lblod.info/id/bestuurseenheden/abc"]',
    );
  }
  if (typeof diagrams !== 'object' && !Array.isArray(diagrams)) {
    throw new HttpError(
      'Property "diagrams" must be an array',
      400,
      'The "diagrams" property must be an array of file uris.',
    );
  }
  if (Array.isArray(diagrams) && !diagrams.every((uri: string) => isUrl(uri))) {
    throw new HttpError(
      'Values of "diagrams" must all be URIs',
      400,
      'The "diagrams" property must be an array of file uris. Example: ["http://data.lblod.info/files/abc"]',
    );
  }
  if (typeof attachments !== 'object' && !Array.isArray(attachments)) {
    throw new HttpError(
      'Property "attachments" must be an array',
      400,
      'The "attachments" property must be an array of file uris.',
    );
  }
  if (
    Array.isArray(attachments) &&
    !attachments.every((uri: string) => isUrl(uri))
  ) {
    throw new HttpError(
      'Values of "attachments" must all be URIs',
      400,
      'The "attachments" property must be an array of file uris. Example: ["http://data.lblod.info/files/abc"]',
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

async function isExistingProcessUri(processUri: string): Promise<boolean> {
  const sudoResult = await query(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    ASK {
      ${sparqlEscapeUri(processUri)} a dpv:Process .
    }
    `,
    { sudo: true },
  );
  return Boolean(sudoResult.boolean);
}
