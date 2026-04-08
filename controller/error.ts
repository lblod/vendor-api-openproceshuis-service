import {
  update,
  uuid,
  sparqlEscapeUri,
  sparqlEscapeString,
  sparqlEscapeDateTime,
} from 'mu';

const ERROR_RESOURCE_TYPE_URI =
  process.env.ERROR_RESOURCE_TYPE_URI ||
  'http://open-services.net/ns/core#Error';
const ERROR_GRAPH_URI =
  process.env.ERROR_GRAPH || 'http://mu.semte.ch/graphs/errors';
const ERROR_CREATOR_URI =
  process.env.ERROR_CREATOR || 'http://lblod.data.gift/services/oph/vendor-api';
const ERROR_URI_PREFIX =
  process.env.ERROR_URI_PREFIX ||
  'http://lblod.data.gift/vocabularies/openproceshuis/error/';

export async function createError(errorMsg: string, stacktrace: unknown) {
  const id = uuid();
  const escapedUri = sparqlEscapeUri(ERROR_URI_PREFIX + id);
  const now = new Date();
  const msgWithTime = `[${now.toISOString()}] ${errorMsg}`;

  await update(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(ERROR_GRAPH_URI)} {
        ${escapedUri} a ${sparqlEscapeUri(ERROR_RESOURCE_TYPE_URI)} .
        ${escapedUri} mu:uuid ${sparqlEscapeString(id)} .
        ${escapedUri} dct:created ${sparqlEscapeDateTime(now)} .
        ${escapedUri} dct:creator ${sparqlEscapeUri(ERROR_CREATOR_URI)} .
        ${escapedUri} dct:subject ${sparqlEscapeString('Vendor API')} .
        ${escapedUri} oslc:message ${sparqlEscapeString(msgWithTime)} .
        ${stacktrace ? `${escapedUri} oslc:largePreview  ${sparqlEscapeString(stacktrace)} .` : ''}
      }
    }
  `,
  );
}
