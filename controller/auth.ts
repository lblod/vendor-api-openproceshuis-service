import { sparqlEscapeUri, query } from 'mu';
import { Request } from 'express';

import { HttpError } from '../util/http-error';
import { BestuursEenheid } from '../types';
import { getSessionUriFromRequest } from './request';

export const SESSION_GRAPH_URI =
  process.env.SESSION_GRAPH || 'http://mu.semte.ch/graphs/sessions';
export const ORGANIZATION_GRAPH_BASE_URI =
  'http://mu.semte.ch/graphs/organizations/';

export async function authenticateBeforeAction(request: Request) {
  const sessionUri = getSessionUriFromRequest(request);
  const accountUri = await getAccountForSessionUri(sessionUri);
  if (!accountUri) {
    throw new HttpError(
      'No account found for session',
      401,
      'The used session is not active or linked to a known account.',
    );
  }

  const bestuursEenheid = await getBestuurseenheidForSession(sessionUri);
  if (!bestuursEenheid) {
    throw new HttpError(
      'No valid bestuurseenheid is linked to the found account.',
      400,
      'The bestuurseenheid on the account is invalid.',
    );
  }

  return { bestuursEenheid: bestuursEenheid, sessionUri: sessionUri };
}

export async function isCurrentSessionOfAVendor(sessionUri: string) {
  const allowedClassifications = [
    'http://data.vlaanderen.be/id/concept/BestuurseenheidClassificatieCode/c4483583-f9fe-4d2f-96f4-47ddb3440d71', // Leverancier
  ];
  const sudoResult = await query(
    `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX org: <http://www.w3.org/ns/org#>

    ASk {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?bestuurseenheid .
      }
      ?bestuurseenheid org:classification  ?classification.
      FILTER(?classification IN(${allowedClassifications.map((uri) => sparqlEscapeUri(uri)).join(',')}))
    }
    `,
    { sudo: true },
  );

  return Boolean(sudoResult.boolean);
}

async function getAccountForSessionUri(sessionUri: string) {
  if (!sessionUri) {
    return null;
  }

  const sparqlResult = await query(
    `
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>
    
    SELECT ?account
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} session:account ?account .
      }
    } LIMIT 1
  `,
    { sudo: true },
  );

  const accountUri = sparqlResult.results.bindings?.[0]?.account.value;
  console.log(`Account <${accountUri}> is logged in.`);
  return accountUri;
}

async function getBestuurseenheidForSession(
  sessionUri: string,
): Promise<BestuursEenheid | null> {
  const sparqlResult = await query(
    `
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>

    SELECT DISTINCT ?bestuurseenheid ?id
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ${sparqlEscapeUri(sessionUri)} ext:sessionGroup ?bestuurseenheid .
      }
      ?bestuurseenheid mu:uuid ?id .
    } LIMIT 1
  `,
    { sudo: true },
  );

  const result = sparqlResult.results.bindings[0];
  if (!result) {
    return null;
  }

  return {
    id: result.id?.value,
    uri: result.bestuurseenheid?.value,
    organizationGraphUri: `${ORGANIZATION_GRAPH_BASE_URI}${result.id?.value}`,
  };
}
