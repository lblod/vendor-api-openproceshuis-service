import { query, sparqlEscapeString, sparqlEscapeUri, uuid } from 'mu';
import { updateQueryWithCatch } from '../util/sparql-with-try-catch';
import { log } from '../util/logger';
export async function versionCurrentProcessWithUri(processUri: string) {
  const latestVersionUri = await fetchLatestVersionForProcessUri(processUri);
  const newVersionId = uuid();
  const newVersionUri = `http://data.lblod.info/processes/versions/${newVersionId}`;
  await updateQueryWithCatch(
    `
    PREFIX mu:   <http://mu.semte.ch/vocabularies/core/>
    PREFIX dct:  <http://purl.org/dc/terms/>
    PREFIX dpv:  <https://w3id.org/dpv#>
    PREFIX ext:  <http://mu.semte.ch/vocabularies/ext/>
    PREFIX prov: <http://www.w3.org/ns/prov#>

    INSERT {
      ${sparqlEscapeUri(newVersionUri)} a dpv:Process .
      ${sparqlEscapeUri(newVersionUri)} a ext:VersionedProcess .
      ${sparqlEscapeUri(newVersionUri)} mu:uuid ${sparqlEscapeString(newVersionId)} .
      ${sparqlEscapeUri(newVersionUri)} dct:isVersionOf ?process .
      ${latestVersionUri ? `${sparqlEscapeUri(newVersionUri)} prov:wasRevisionOf ${sparqlEscapeUri(latestVersionUri)} .` : ''}

      ${sparqlEscapeUri(newVersionUri)} ?p ?o .
    }
    WHERE {
      VALUES ?process { ${sparqlEscapeUri(processUri)} }
      ?process a dpv:Process .
      ?process ?p ?o .

      filter(?p NOT IN(
                      ext:hasStatistics,
                      dct:versions,
                      mu:uuid
                    ))
    }
    `,
    { sudo: false },
    'Sparql query for creating a version for the current process failed.',
    {
      process: processUri,
      newVersion: newVersionUri,
      previousVersion: latestVersionUri,
    },
  );
  log.debug('Created new version for process', {
    process: processUri,
    newVersion: newVersionUri,
    previousVersion: latestVersionUri,
  });
}

async function fetchLatestVersionForProcessUri(
  processUri: string,
): Promise<string | undefined> {
  const sparqlResult = await query(`
    PREFIX ext:  <http://mu.semte.ch/vocabularies/ext/>
    PREFIX dpv:  <https://w3id.org/dpv#>
    PREFIX dct:  <http://purl.org/dc/terms/>
    SELECT ?version 
    WHERE {
      VALUES ?process { ${sparqlEscapeUri(processUri)} }
      ?version a ext:VersionedProcess .
      ?version dct:created ?created .
      ?version dct:isVersionOf ?process .
    }
    ORDER BY DESC(?created)
    LIMIT 1
  `);

  return sparqlResult.results.bindings[0]?.version?.value;
}
