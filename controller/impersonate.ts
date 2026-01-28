import { sparqlEscapeUri, query } from 'mu';
import { updateQueryWithCatch } from '../util/sparql-with-try-catch';
import { isCurrentSessionOfAVendor, SESSION_GRAPH_URI } from './auth';
import { log } from '../util/logger';
import { HttpError } from '../util/http-error';

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
    'Sparql query for removing current impersonation from session failed.',
    {
      session: sessionUri,
    },
  );
  log.info('Removed current impersonation from session', {
    session: sessionUri,
  });
  const isSessionOfVendor = await isCurrentSessionOfAVendor(sessionUri);
  if (!isSessionOfVendor) {
    throw new HttpError(
      'Only vendors can impersonate.',
      403,
      'You cannot use this endpoint when you are not a vendor.',
    );
  }
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
    'Sparql query for start impersonation with session failed.',
    {
      session: sessionUri,
      bestuurseenheid: bestuurseenheidUri,
    },
  );
  log.info('Session can now impersonate bestuurseenheid.', {
    session: sessionUri,
    bestuurseenheid: bestuurseenheidUri,
  });
}

export async function getVendorUriFromSession(sessionUri: string) {
  const sparqlResult = await query(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    SELECT ?bestuurseenheid
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        {
          ${sparqlEscapeUri(sessionUri)} ext:originalSessionGroup ?bestuurseenheid .
        }
        UNION
        {
          ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?bestuurseenheid .        
        }
      }
    } LIMIT 1
    `,
    { sudo: true },
  );

  return sparqlResult.results.bindings[0]?.bestuurseenheid?.value;
}
