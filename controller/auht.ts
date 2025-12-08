import { sparqlEscapeUri, query } from 'mu';
import { Request } from 'express';

import { HttpError } from '../util/http-error';
import { BestuursEenheid } from '../types';

export const SESSION_GRAPH_URI =
  process.env.SESSION_GRAPH || 'http://mu.semte.ch/graphs/sessions';
export const ORGANIZATION_GRAPH_BASE_URI =
  'http://mu.semte.ch/graphs/organizations/';

export async function authenticateBeforeAction(request: Request) {
  const sessionUri = sessionUriFromRequest(request);
  const accountUri = await getAccountForSessionUri(sessionUri);

  if (!accountUri) {
    throw new HttpError(
      'No account found for session',
      401,
      'The used session is not active or linked to a known account.',
    );
  }

  const bestuursEenheid = await getBestuurseenheidForSession(sessionUri);

  return { bestuursEenheid: bestuursEenheid, sessionUri: sessionUri };
}

function sessionUriFromRequest(request: Request) {
  const HEADER_MU_SESSION_ID = 'mu-session-id';
  const sessionUri = request.get(HEADER_MU_SESSION_ID);

  if (!sessionUri) {
    throw new HttpError(
      'Missing session header',
      400,
      `The session header '${HEADER_MU_SESSION_ID}' was not found in the request headers.`,
    );
  }
  console.log(`Session <${sessionUri}> found in request.`);
  return sessionUri;
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
