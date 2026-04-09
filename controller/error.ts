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
const ERROR_GRACE_PERIOD_IN_MINUTES =
  process.env.ERROR_GRACE_PERIOD_IN_MINUTES || 5;
const ERROR_THRESHOLD_OCCURRENCES =
  parseInt(process.env.ERROR_THRESHOLD_OCCURRENCES) || 2;

export async function handleErrorForMonitoring(
  statusCode: number,
  errorMsg: string,
  stacktrace: unknown,
) {
  if (statusCode >= 400 && statusCode < 500) {
    return;
  }

  let triggerMail = false;
  let message = errorMsg;
  const countInLastMinutes = await errorCountInLastMinutes(errorMsg);
  if (countInLastMinutes >= ERROR_THRESHOLD_OCCURRENCES) {
    const isMailSendInGracePeriod =
      await wasMailTriggeredInGracePeriod(errorMsg);
    const triggersInfo = `(was triggered ${countInLastMinutes} time(s) in last ${ERROR_GRACE_PERIOD_IN_MINUTES} minutes)`;
    message = `${errorMsg} ${triggersInfo}`;
    triggerMail = !isMailSendInGracePeriod;
  }

  log.info(message, {
    statusCode,
    stackTrace: stacktrace,
    mailSend: triggerMail,
  });
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
    { sudo: true },
  );
}

async function errorCountInLastMinutes(errorMsg: string) {
  const sparqlResult = await query(
    `
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
          STR(?created) > STR(bif:dateadd('minute', -${ERROR_GRACE_PERIOD_IN_MINUTES}, now()))
        )
      }
    }  
  `,
    { sudo: true },
  );

  return parseInt(sparqlResult.results?.bindings?.[0]?.count.value) ?? 0;
}

async function wasMailTriggeredInGracePeriod(errorMsg: string) {
  const sparqlResult = await query(
    `
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX oslc: <http://open-services.net/ns/core#>
    PREFIX oph: <http://lblod.data.gift/vocabularies/openproceshuis/>

    ASK {
      GRAPH ${sparqlEscapeUri(ERROR_GRAPH_URI)} {
        ?error a ${sparqlEscapeUri(ERROR_RESOURCE_TYPE_URI)} .
        ?error dct:created ?created .
        ?error oslc:message ?message .
        FILTER(
          CONTAINS(str(?message), ${sparqlEscapeString(errorMsg)}) &&
          STR(NOW()) < STR(bif:dateadd('minute', ${ERROR_GRACE_PERIOD_IN_MINUTES}, ?created))
        )
      }
    }  
  `,
    { sudo: true },
  );

  return Boolean(sparqlResult.boolean) ?? false;
}
