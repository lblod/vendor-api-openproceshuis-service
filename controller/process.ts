import { HttpError } from '../util/http-error';
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
