import { Request } from 'express';

import { HttpError } from '../util/http-error';
import isUrl from '../util/is-url';
import {
  BestuursEenheid,
  CreateProcessRequest,
  PatchProcessRequest,
  PutProcessRequest,
} from '../types';
import { sparqlEscapeUri, query, update, sparqlEscapeString } from 'mu';

export function idMustBeInRequestBody(request: Request): void {
  const id = request.body['@id'];
  const isAvailable = id && typeof id == 'string' && id.trim() !== '';

  if (!isAvailable) {
    throw new HttpError(
      'The process URI must be set in the request body under property "@id"',
      400,
      'Without the @id we do not have enough context about the resource.',
    );
  }
}

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
  validateRequestValues(request, { post: true });
  const {
    title = null,
    description = null,
    contact = null,
    linkedInventoryProcess = null,
    users = null,
    diagrams = null,
    attachments = null,
  } = request.body;

  return {
    '@id': request.body['@id'],
    title: title,
    description: description,
    contact: contact,
    linkedInventoryProcess: linkedInventoryProcess,
    users,
    diagrams,
    attachments,
  };
}

export async function patchProcess(
  process: PatchProcessRequest,
): Promise<void> {
  if (!(await isExistingProcessUri(process['@id']))) {
    throw new HttpError(
      'Process with uri not found.',
      404,
      'The given uri for the process was not found. Does it exist? Do you have rights to update the process?',
    );
  }
  let title = '';
  let description = '';
  let contact = '';
  let linkedInventoryProcess = '';
  let users = '';
  let diagrams = '';
  let attachments = '';
  const whereQueryValues = [];

  if (process.title) {
    title = `?process dct:title ${sparqlEscapeString(process.title)} .`;
    whereQueryValues.push('?process dct:title ?title .');
  }
  if (process.description) {
    description = `?process dct:description ${sparqlEscapeString(process.description)} .`;
    whereQueryValues.push('?process dct:description ?description .');
  }
  if (process.contact) {
    contact = `?process schema:email ${sparqlEscapeString(process.contact)} .`;
    whereQueryValues.push('?process schema:email ?contact .');
  }
  if (process.linkedInventoryProcess) {
    linkedInventoryProcess = `?process dct:source ${sparqlEscapeUri(process.linkedInventoryProcess)} .`;
    whereQueryValues.push('?process dct:source ?source .');
  }
  if (process.users) {
    users = process.users
      .map((uri) => `?process prov:usedBy ${sparqlEscapeUri(uri)} .`)
      .join('\n');
    whereQueryValues.push('?process prov:usedBy ?users .');
  }
  if (process.diagrams) {
    diagrams = process.diagrams
      .map((uri) => `?process nie:isPartOf ${sparqlEscapeUri(uri)} .`)
      .join('\n');
    whereQueryValues.push('?process nie:isPartOf ?diagrams .');
  }
  if (process.attachments) {
    attachments = process.attachments
      .map((uri) => `?process nie:isPartOf ${sparqlEscapeUri(uri)} .`)
      .join('\n');
    whereQueryValues.push('?process nie:isPartOf ?attachments .');
  }
  await update(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX schema: <https://schema.org/>
    DELETE {
      ${whereQueryValues.join('\n')}
    }
    INSERT {
      ${title}
      ${description}
      ${contact}
      ${linkedInventoryProcess}
      ${users}
      ${diagrams}
      ${attachments}
    }
    WHERE {
      GRAPH ?g {
        VALUES ?process { ${sparqlEscapeUri(process['@id'])} }
        ?process a dpv:Process .
        ${whereQueryValues.map((value) => `OPTIONAL { ${value} }`).join('\n')}
      }
    }  
  `,
    { sudo: false },
  );
  console.log(
    `Updated properties of process ${sparqlEscapeUri(process['@id'])}. (${Object.keys(process).join(', ')}) `,
  );
}

export function createPatchProcessRequest(
  request: Request,
): PatchProcessRequest {
  validateRequestValues(request, { patch: true });

  const dataToPatch = {
    '@id': request.body['@id'],
  };

  Object.keys(request.body).map((key) => {
    if (request.body[key]) {
      dataToPatch[key] = request.body[key];
    }
  });

  return dataToPatch;
}

export async function putProcess(process: PutProcessRequest): Promise<void> {
  if (!(await isExistingProcessUri(process['@id']))) {
    throw new HttpError(
      'Process with uri not found.',
      404,
      'The given uri for the process was not found. Does it exist? Do you have rights to update the process?',
    );
  }

  const whereQueryValues = [
    '?process dct:title ?title .',
    '?process dct:description ?description .',
    '?process schema:email ?contact .',
    '?process dct:source ?source .',
    '?process prov:usedBy ?users .',
    '?process nie:isPartOf ?diagrams .',
    '?process nie:isPartOf ?attachments .',
  ];
  let usersQuery = '';
  let diagramsQuery = '';
  let attachmentsQuery = '';
  if (process.users.length >= 1) {
    usersQuery = `
      VALUES ?newUsers { ${process.users.map((userUri) => sparqlEscapeUri(userUri))} }
      ?process prov:usedBy ?newUsers .
    `;
  }
  if (process.diagrams.length >= 1) {
    diagramsQuery = `
      VALUES ?newDiagrams { ${process.diagrams.map((diagramUri) => sparqlEscapeUri(diagramUri))} }
      ?process nie:isPartOf ?newDiagrams .
    `;
  }
  if (process.attachments.length >= 1) {
    attachmentsQuery = `
      VALUES ?newAttachments { ${process.attachments.map((attachmentUri) => sparqlEscapeUri(attachmentUri))} }
      ?process nie:isPartOf ?newAttachments .
    `;
  }
  await update(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX prov: <http://www.w3.org/ns/prov#>
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX schema: <https://schema.org/>
    DELETE {
      ${whereQueryValues.join('\n')}
    }
    INSERT {
      ?process dct:title ${sparqlEscapeString(process.title)} .
      ?process dct:description ${sparqlEscapeString(process.description)}.
      ?process schema:email ${sparqlEscapeString(process.contact)}.
      ?process dct:source ${sparqlEscapeUri(process.linkedInventoryProcess)}.
      ${usersQuery}
      ${diagramsQuery}
      ${attachmentsQuery}
    }
    WHERE {
      GRAPH ?g {
        VALUES ?process { ${sparqlEscapeUri(process['@id'])} }
        ?process a dpv:Process .
        ${whereQueryValues.map((value) => `OPTIONAL { ${value} }`).join('\n')}
      }
    }  
  `,
    { sudo: false },
  );
  console.log(
    `Replaced properties of process ${sparqlEscapeUri(process['@id'])} with new values. `,
  );
}

export function createPutProcessRequest(request: Request): PutProcessRequest {
  const allProcessKeys = [
    '@id',
    'title',
    'description',
    'contact',
    'linkedInventoryProcess',
    'users',
    'diagrams',
    'attachments',
  ];
  const isContainingAllKeys = Object.keys(request.body).every((key) =>
    allProcessKeys.includes(key),
  );

  if (!isContainingAllKeys) {
    throw new HttpError(
      'Not all keys are provided or have a value.',
      400,
      `Make sure to add all process properties in the body with there value when doing a PUT request. (${allProcessKeys.join(', ')})`,
    );
  }
  validateRequestValues(request, { put: true });

  return {
    '@id': request.body['@id'],
    title: request.body['title'],
    contact: request.body['contact'],
    description: request.body['description'],
    linkedInventoryProcess: request.body['linkedInventoryProcess'],
    users: request.body['users'],
    diagrams: request.body['diagrams'],
    attachments: request.body['attachments'],
  };
}

export async function archiveProcess(processUri: string): Promise<void> {
  if (!(await isExistingProcessUri(processUri))) {
    throw new HttpError(
      'Process with uri not found.',
      404,
      'The given uri for the process was not found. Does it exist? Do you have rights to update the process?',
    );
  }

  await update(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    DELETE {
        ?process adms:status ?status .
    }
    INSERT {
        ?process adms:status ${sparqlEscapeUri('http://lblod.data.gift/concepts/concept-status/gearchiveerd')} .
    }
    WHERE {
      VALUES ?process { ${sparqlEscapeUri(processUri)} }
      ?process a dpv:Process .

      OPTIONAL {
        ?process adms:status ?status .
      } 
    }  
  `,
    { sudo: false },
  );

  console.log(
    `Set archived status on  process ${sparqlEscapeUri(processUri)}.`,
  );
}

export async function removeFileFromProcess(
  processUri: string,
  fileUri: string,
): Promise<void> {
  const sparqlResult = await query(
    `
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    ASK {
      ?process nie:isPartOf ${sparqlEscapeUri(fileUri)} .
    }  
  `,
    { sudo: false },
  );
  const fileExistsOnProcess = Boolean(sparqlResult.boolean);
  if (!fileExistsOnProcess) {
    throw new HttpError(
      'Could not find file on process.',
      400,
      `The file ${sparqlEscapeUri(fileUri)} was not found on process ${sparqlEscapeUri(processUri)}.`,
    );
  }

  await update(
    `
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX dpv: <https://w3id.org/dpv#>
    DELETE {
      ?process nie:isPartOf ${sparqlEscapeUri(fileUri)} .
    }
    WHERE {
      VALUES ?process { ${sparqlEscapeUri(processUri)} }
      ?process a dpv:Process .
    }  
  `,
    { sudo: false },
  );
}

function validateRequestValues(
  request: Request,
  requestType: { post?: boolean; patch?: boolean; put?: boolean },
) {
  const id = request.body['@id'];
  const {
    title = null,
    contact = null,
    description = null,
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
  if (requestType.post && !title) {
    throw new HttpError(
      'Property "title" is required in the body.',
      400,
      'When creating a process the "title" property must be in the request body.',
    );
  }
  if (requestType.put && typeof contact == 'string' && contact.trim() == '') {
    throw new HttpError(
      'Property "contact" cannot be empty.',
      400,
      'When replacing a process the "contact" property must be in the request body.',
    );
  }
  if (
    requestType.put &&
    typeof description == 'string' &&
    description.trim() == ''
  ) {
    throw new HttpError(
      'Property "description" cannot be empty.',
      400,
      'When replacing a process the "description" property must be in the request body.',
    );
  }
  if (
    (requestType.patch || requestType.put) &&
    title &&
    typeof title == 'string' &&
    title.trim() == ''
  ) {
    throw new HttpError(
      'Property "title" cannot be empty',
      400,
      'The "title" of the process should be an identifier for frontend applications, do not leave this empty.',
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
