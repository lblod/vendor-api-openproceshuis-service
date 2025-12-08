import { sparqlEscapeUri, query } from 'mu';
import { Request } from 'express';

import { HttpError } from '../util/http-error';

export const SESSION_GRAPH_URI =
  process.env.SESSION_GRAPH || 'http://mu.semte.ch/graphs/sessions';

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
