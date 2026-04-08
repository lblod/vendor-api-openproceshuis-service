import {
  update,
  uuid,
  sparqlEscapeUri,
  sparqlEscapeString,
  sparqlEscapeDateTime,
  query,
} from 'mu';
import { log } from '../util/logger';

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

export async function handleErrorForMonitoring(
  statusCode: number,
  errorMsg: string,
  stacktrace: unknown,
) {
  if (statusCode >= 400 && statusCode < 500) {
    return;
  }

  const gracePeriodInMinutes = 2;
  const thresholdOccurrences = 5;
  const countInLastMinutes = await errorCountDuringGracePeriod(
    errorMsg,
    gracePeriodInMinutes,
  );
  log.info(
    `Error was triggered ${countInLastMinutes} time(s) in last ${gracePeriodInMinutes} minutes`,
    {
      statusCode,
      message: errorMsg,
      stackTrace: stacktrace,
    },
  );
  let triggerMail = false;
  let message = errorMsg;
  if (countInLastMinutes >= thresholdOccurrences) {
    triggerMail = true;
    const triggersInfo = `(was triggered ${countInLastMinutes} time(s) in last ${gracePeriodInMinutes} minutes)`;
    message = `${errorMsg} ${triggersInfo}`;
  }

  await createError(message, stacktrace, triggerMail);
}

async function createError(
  errorMsg: string,
  stacktrace: unknown,
  triggerEmailSend = false,
) {
  const id = uuid();
  const escapedUri = sparqlEscapeUri(ERROR_URI_PREFIX + id);
  const now = new Date();
  const msgWithTime = `[${now.toISOString()}] ${errorMsg}`;

  let typeToTriggerDelta = '';
  if (triggerEmailSend) {
    typeToTriggerDelta = `, ${sparqlEscapeUri(ERROR_RESOURCE_TYPE_URI)}`;
  }
  await update(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX oph: <http://lblod.data.gift/vocabularies/openproceshuis/>

    INSERT DATA {
      GRAPH ${sparqlEscapeUri(ERROR_GRAPH_URI)} {
        ${escapedUri} a oph:Error ${typeToTriggerDelta} .
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

async function errorCountDuringGracePeriod(errorMsg: string, minutes: number) {
  const sparqlResult = await query(`
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX oph: <http://lblod.data.gift/vocabularies/openproceshuis/>

    SELECT (COUNT(DISTINCT(?error)) AS ?count)
    WHERE {
      GRAPH ${sparqlEscapeUri(ERROR_GRAPH_URI)} {
        ?error a oph:Error .
        ?error dct:created ?created .
        ?error oslc:message ?message .
        FILTER(
          CONTAINS(str(?message), ${sparqlEscapeString(errorMsg)}) &&
          STR(?created) > STR(bif:dateadd('minute', -${minutes}, now()))
        )
      }
    }  
  `);

  return parseInt(sparqlResult.results?.bindings?.[0]?.count.value) ?? 0;
}
