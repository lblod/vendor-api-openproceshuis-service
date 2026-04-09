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
  title: string,
  description?: string,
  detail?: unknown,
) {
  if (statusCode >= 400 && statusCode < 500) {
    return;
  }

  let triggerMail = false;
  let message = description ?? '';
  const countInLastMinutes = await errorCountInLastMinutes(title);
  if (countInLastMinutes >= ERROR_THRESHOLD_OCCURRENCES) {
    const isMailSendInGracePeriod = await wasMailTriggeredInGracePeriod(title);
    const triggersInfo = `This error was triggered ${countInLastMinutes} time(s) in last ${ERROR_GRACE_PERIOD_IN_MINUTES} minute(s).`;
    message += `\n\n ${triggersInfo}`;
    triggerMail = !isMailSendInGracePeriod;
  }

  log.info('Creating an error resource', {
    statusCode,
    title,
    description: message,
    detail: detail,
    mailSend: triggerMail,
  });
  await createError(title, message, detail, triggerMail);
}

async function createError(
  title: string,
  message: string,
  detail: unknown,
  triggerEmailSend = false,
) {
  const id = uuid();
  const uri = ERROR_URI_PREFIX + id;
  const escapedUri = sparqlEscapeUri(uri);
  const now = new Date();

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
        ${escapedUri} dct:subject ${sparqlEscapeString(title)} .
        ${escapedUri} oslc:message ${sparqlEscapeString(message)} .
        ${escapedUri} dct:references ${sparqlEscapeUri(uri)} .
        ${detail ? `${escapedUri} oslc:largePreview  ${sparqlEscapeString(detail)} .` : ''}
      }
    }
  `,
    { sudo: true },
  );
}

async function errorCountInLastMinutes(subject: string) {
  const sparqlResult = await query(
    `
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX oph: <http://lblod.data.gift/vocabularies/openproceshuis/>

    SELECT (COUNT(DISTINCT(?error)) AS ?count)
    WHERE {
      GRAPH ${sparqlEscapeUri(ERROR_GRAPH_URI)} {
        ?error a oph:Error .
        ?error dct:created ?created .
        ?error dct:subject ?message .
        FILTER(
          CONTAINS(str(?message), ${sparqlEscapeString(subject)}) &&
          STR(?created) > STR(bif:dateadd('minute', -${ERROR_GRACE_PERIOD_IN_MINUTES}, now()))
        )
      }
    }  
  `,
    { sudo: true },
  );

  return parseInt(sparqlResult.results?.bindings?.[0]?.count.value) ?? 0;
}

async function wasMailTriggeredInGracePeriod(subject: string) {
  const sparqlResult = await query(
    `
    PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX oph: <http://lblod.data.gift/vocabularies/openproceshuis/>

    ASK {
      GRAPH ${sparqlEscapeUri(ERROR_GRAPH_URI)} {
        ?error a ${sparqlEscapeUri(ERROR_RESOURCE_TYPE_URI)} .
        ?error dct:created ?created .
        ?error dct:subject ?subject .
        FILTER(
          CONTAINS(str(?subject), ${sparqlEscapeString(subject)}) &&
          STR(NOW()) < STR(bif:dateadd('minute', ${ERROR_GRACE_PERIOD_IN_MINUTES}, ?created))
        )
      }
    }  
  `,
    { sudo: true },
  );

  return Boolean(sparqlResult.boolean) ?? false;
}
