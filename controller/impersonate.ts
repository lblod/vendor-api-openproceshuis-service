import { sparqlEscapeUri, query } from 'mu';
import { updateQueryWithCatch } from '../util/sparql-with-try-catch';
import { SESSION_GRAPH_URI } from './auht';

export async function isValidBestuurseenheid(bestuurseenheidUri: string) {
  const sparqlResult = await query(`
    PREFIX besluit: <http://data.vlaanderen.be/ns/besluit#>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    ASK {
      ${sparqlEscapeUri(bestuurseenheidUri)} a besluit:Bestuurseenheid .
      ${sparqlEscapeUri(bestuurseenheidUri)} mu:uuid ?id .
    }  
  `);

  return Boolean(sparqlResult.boolean);
}

export async function impersonateAsBestuurseenheid(
  sessionUri: string,
  bestuurseenheidUri: string,
) {
  await updateQueryWithCatch(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>
    DELETE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?sessionGroup .
      }
    }
    INSERT {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?originalSessionGroup .
      }
    }
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?sessionGroup .
        ${sparqlEscapeUri(sessionUri)} ext:originalSessionGroup ?originalSessionGroup .
      }
    }
    `,
    { sudo: true },
    `Sparql query for removing current impersonation from session ${sparqlEscapeUri(sessionUri)} failed.`,
  );
  console.log(
    `Removed current impersonation from session ${sparqlEscapeUri(sessionUri)}.`,
  );
  await updateQueryWithCatch(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?sessionGroup .
      }
    }
    INSERT {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ${sparqlEscapeUri(bestuurseenheidUri)} .
        ${sparqlEscapeUri(sessionUri)} ext:originalSessionGroup ?sessionGroup .
      }
    }
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?sessionGroup .
      }
    }
    `,
    { sudo: true },
    `Sparql query for start impersonation ${sparqlEscapeUri(bestuurseenheidUri)} with session ${sparqlEscapeUri(sessionUri)} failed.`,
  );
  console.log(
    `Session ${sparqlEscapeUri(sessionUri)}can now impersonate bestuurseenheid ${sparqlEscapeUri(bestuurseenheidUri)}.`,
  );
}
