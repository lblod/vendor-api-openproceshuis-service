import { sparqlEscapeUri, update } from 'mu';
import { SESSION_GRAPH_URI } from './auht';

export async function configureActOnBehalf(
  sessionUri: string,
  bestuursEenheidUri: string,
): Promise<void> {
  await update(
    `
    PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ?sessionUri muAccount:canActOnBehalfOf ?currentImpersonationBestuurseenheid .
      }
    }
    INSERT {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ?sessionUri muAccount:canActOnBehalfOf ${sparqlEscapeUri(bestuursEenheidUri)} .
      }
    }
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        VALUES ?sessionUri { ${sparqlEscapeUri(sessionUri)} }
        ?sessionUri session:account ?account .
        OPTIONAL {
          ?sessionUri muAccount:canActOnBehalfOf ?currentImpersonationBestuurseenheid .
        }
      }
    }
    `,
    { sudo: true },
  );
  console.log(
    `Session ${sparqlEscapeUri(sessionUri)} started acting on behalf of ${sparqlEscapeUri(bestuursEenheidUri)}.`,
  );
}

export async function removeActOnBehalf(sessionUri: string): Promise<void> {
  await update(
    `
    PREFIX muAccount: <http://mu.semte.ch/vocabularies/account/>
    PREFIX session: <http://mu.semte.ch/vocabularies/session/>
    PREFIX ext: <http://mu.semte.ch/vocabularies/ext/>
    DELETE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        ?sessionUri muAccount:canActOnBehalfOf ?currentImpersonationBestuurseenheid .
      }
    }
    WHERE {
      GRAPH ${sparqlEscapeUri(SESSION_GRAPH_URI)} {
        VALUES ?sessionUri { ${sparqlEscapeUri(sessionUri)} }
        ?sessionUri session:account ?account .
        OPTIONAL {
          ?sessionUri muAccount:canActOnBehalfOf ?currentImpersonationBestuurseenheid .
        }
      }
    }
  `,
    { sudo: true },
  );
  console.log(`Session ${sparqlEscapeUri(sessionUri)} stopt impersonating.`);
}
