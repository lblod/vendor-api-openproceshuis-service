import { Request } from 'express';

import { HttpError } from '../util/http-error';
import isUrl from '../util/is-url';
import { BestuursEenheid } from '../types';
import {
  sparqlEscapeUri,
  query,
  sparqlEscapeString,
  uuid,
  sparqlEscapeDateTime,
} from 'mu';
import { updateQueryWithCatch } from '../util/sparql-with-try-catch';
import { log } from '../util/logger';

export async function createNewProcess(
  processUri: string,
  bestuurseenheid: BestuursEenheid,
  vendorUri: string,
  requestInsertDataTriples: string,
): Promise<string> {
  if (await isExistingProcessUri(processUri)) {
    throw new HttpError(
      'Process with uri already exists.',
      409,
      'The given uri for the process already exists in the database.',
    );
  }
  await updateQueryWithCatch(
    `
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    INSERT DATA {
      ${requestInsertDataTriples}
      ${sparqlEscapeUri(processUri)} mu:uuid ${sparqlEscapeString(uuid())}.
      ${sparqlEscapeUri(processUri)} dct:publisher ${sparqlEscapeUri(bestuurseenheid.uri)} .
      ${sparqlEscapeUri(processUri)} dct:creator ${sparqlEscapeUri(vendorUri)} .
      ${sparqlEscapeUri(processUri)} dct:contributor ${sparqlEscapeUri(vendorUri)} .
      ${sparqlEscapeUri(processUri)} dct:created ${sparqlEscapeDateTime(new Date())} .
    }  
  `,
    { sudo: false },
    'Sparql query for creating process resource failed.',
    {
      process: processUri,
    },
  );
  log.info('Added process to bestuurseenheid.', {
    process: processUri,
    bestuurseenheid: bestuurseenheid.uri,
  });

  return processUri;
}

export async function patchProcess(
  processUri: string,
  vendorUri: string,
  requestInsertDataTriples: string,
  requestDeleteDataTriples: { delete: string; where: string },
): Promise<void> {
  if (!(await isExistingProcessUri(processUri))) {
    throw new HttpError(
      'Process with uri not found.',
      404,
      'The given uri for the process was not found. Does it exist? Do you have rights to update the process?',
    );
  }

  await updateQueryWithCatch(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    DELETE {
      ${requestDeleteDataTriples.delete}
    }
    WHERE {
      GRAPH ?g {
        VALUES ?process { ${sparqlEscapeUri(processUri)} }
        ?process a dpv:Process .
        ${requestDeleteDataTriples.where}
      }
    }  
  `,
    { sudo: false },
    'Sparql query for updating process resource properties failed.',
    {
      process: processUri,
    },
  );
  log.debug('Removed properties of process', {
    triples: requestDeleteDataTriples,
  });
  await updateQueryWithCatch(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    PREFIX dct: <http://purl.org/dc/terms/>
    INSERT {
      ${requestInsertDataTriples}
      ?process dct:contributor ${sparqlEscapeUri(vendorUri)} .
    }
    WHERE {
      GRAPH ?g {
        VALUES ?process { ${sparqlEscapeUri(processUri)} }
        ?process a dpv:Process .
      }
    }  
  `,
    { sudo: false },
    'Sparql query for updating process resource properties failed.',
    {
      process: processUri,
    },
  );
  log.debug('Updated properties of process', {
    triples: requestInsertDataTriples,
  });
}

export function createPutProcessRequest(request: Request): any {
  const allProcessKeys = [
    '@id',
    'title',
    'description',
    'email',
    'linked-concept',
    'users',
    'diagrams',
    'attachments',
  ];
  const isContainingAllKeys = Object.keys(request.body)
    .filter((key) => ['@context'].includes(key))
    .every((key) => allProcessKeys.includes(key));

  if (!isContainingAllKeys) {
    throw new HttpError(
      'Not all keys are provided or have a value.',
      400,
      `Make sure to add all process properties in the body with there value when doing a PUT request. (${allProcessKeys.join(', ')})`,
    );
  }

  return {
    '@id': request.body['@id'],
    title: request.body['title'],
    contact: request.body['email'],
    description: request.body['description'],
    linkedInventoryProcess: request.body['linked-concept'],
    users: request.body['users'],
    diagrams: request.body['diagrams'],
    attachments: request.body['attachments'],
  };
}

export async function archiveProcess(
  processUri: string,
  vendorUri: string,
): Promise<void> {
  if (!(await isExistingProcessUri(processUri))) {
    throw new HttpError(
      'Process with uri not found.',
      404,
      'The given uri for the process was not found. Does it exist? Do you have rights to update the process?',
    );
  }
  const archivedStatusUri =
    'http://lblod.data.gift/concepts/concept-status/gearchiveerd';
  await updateQueryWithCatch(
    `
    PREFIX dpv: <https://w3id.org/dpv#>
    PREFIX adms: <http://www.w3.org/ns/adms#>
    PREFIX dct: <http://purl.org/dc/terms/>
    DELETE {
      ?process adms:status ?status .
    }
    INSERT {
      ?process adms:status ${sparqlEscapeUri(archivedStatusUri)} .
      ?process dct:contributor ${sparqlEscapeUri(vendorUri)} .
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
    'Sparql query for archiving process resource failed.',
    {
      process: processUri,
    },
  );
  log.info('set archived status on process.', {
    process: processUri,
    status: archivedStatusUri,
  });
}

export async function removeFileFromProcess(
  processUri: string,
  fileUri: string,
): Promise<void> {
  const sparqlResult = await query(
    `
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    ASK {
      ${sparqlEscapeUri(fileUri)} nie:isPartOf ?process .
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

  await updateQueryWithCatch(
    `
    PREFIX nie: <http://www.semanticdesktop.org/ontologies/2007/01/19/nie#>
    PREFIX dpv: <https://w3id.org/dpv#>
    DELETE {
      ${sparqlEscapeUri(fileUri)} nie:isPartOf ?process .
    }
    WHERE {
      VALUES ?process { ${sparqlEscapeUri(processUri)} }
      ?process a dpv:Process .
    }  
  `,
    { sudo: false },
    'Sparql query for removing file from process resource failed.',
    {
      process: process['@id'],
      file: fileUri,
    },
  );
  log.info('Removed file from process', {
    process: processUri,
    file: fileUri,
  });
}

export function validateRequestValues(
  request: Request,
  requestType: { post?: boolean; patch?: boolean; put?: boolean },
) {
  const id = request.body['@id'];
  const linkedInventoryProcess = request.body['linked-concept'] ?? null;
  const {
    title = null,
    email = null,
    description = null,
    users = null,
    diagrams = null,
    attachments = null,
  } = request.body;

  if (!id) {
    throw new HttpError(
      'Property "@id" is required in the body.',
      400,
      'The "@id" property must always be in the request body.',
    );
  }
  if (requestType.post && !title) {
    throw new HttpError(
      'Property "title" is required in the body.',
      400,
      'When creating a process the "title" property must be in the request body.',
    );
  }
  if (requestType.put && typeof email == 'string' && email.trim() == '') {
    throw new HttpError(
      'Property "email" cannot be empty.',
      400,
      'When replacing a process the "email" property must be in the request body.',
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
      'Property "linked-concept" must be an URI',
      400,
      'The "linked-concept" property must be the URI of the inventory process subject.',
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
