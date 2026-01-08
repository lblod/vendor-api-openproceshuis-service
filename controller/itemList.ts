import {
  sparqlEscapeDateTime,
  sparqlEscapeInt,
  sparqlEscapeString,
  sparqlEscapeUri,
  uuid,
} from 'mu';
import { isExistingProcessUri } from './process';
import { updateQueryWithCatch } from '../util/sparql-with-try-catch';
import { HttpError } from '../util/http-error';

export async function addNewDiagramsToProcess(
  processUri: string,
  fileUris?: Array<string>,
) {
  if (!fileUris) {
    console.log(
      `Did not add files to process ${sparqlEscapeUri(processUri)} as no files were passed on.`,
    );
    return;
  }
  if (!(await isExistingProcessUri(processUri))) {
    throw new HttpError(
      'Process with uri does not exist.',
      204,
      'The given uri for the process does not exist in the database.',
    );
  }
  const itemListUri = await addNewItemListToProcess(processUri);
  if (fileUris.length >= 1) {
    await addFilesToItemList(itemListUri, fileUris);
  }
}

async function addNewItemListToProcess(processUri: string): Promise<string> {
  const itemListId = uuid();
  const itemListUri = `http://data.lblod.info/lists/${itemListId}`;
  const created = new Date();
  await updateQueryWithCatch(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX schema: <http://schema.org/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX dpv: <https://w3id.org/dpv#>

    INSERT {
      ?process schema:hasPart ${sparqlEscapeUri(itemListUri)} .
      ${sparqlEscapeUri(itemListUri)} a schema:ItemList .
      ${sparqlEscapeUri(itemListUri)} mu:uuid ${sparqlEscapeString(itemListId)} .
      ${sparqlEscapeUri(itemListUri)} schema:itemListOrder schema:ItemListUnordered .
      ${sparqlEscapeUri(itemListUri)} dct:created ${sparqlEscapeDateTime(created)} .
    } WHERE {
      VALUES ?process { ${sparqlEscapeUri(processUri)} }
      ?process a dpv:Process .
    }
    `,
    { sudo: false },
    `Sparql query for adding empty itemList to process ${sparqlEscapeUri(processUri)} failed.`,
  );
  console.log(
    `Created new listItem ${sparqlEscapeUri(itemListUri)} for process ${sparqlEscapeUri(processUri)}.`,
  );

  return itemListUri;
}

async function addFilesToItemList(
  itemListUri: string,
  fileUris: Array<string>,
) {
  const created = new Date();
  const listItems = fileUris.map((fileUri, index) => {
    const listItemId = uuid();
    const listItemUri = `http://data.lblod.info/list-items/${listItemId}`;
    return {
      uri: listItemUri,
      triples: `
      ${sparqlEscapeUri(listItemUri)} a schema:ListItem .
      ${sparqlEscapeUri(listItemUri)} mu:uuid ${sparqlEscapeString(listItemId)} .
      ${sparqlEscapeUri(itemListUri)} dct:created ${sparqlEscapeDateTime(created)} .
      ${sparqlEscapeUri(itemListUri)} schema:item ${sparqlEscapeUri(fileUri)} .
      ${sparqlEscapeUri(itemListUri)} schema:position ${sparqlEscapeInt(index)} .
    `,
    };
  });
  await updateQueryWithCatch(
    `
    PREFIX mu: <http://mu.semte.ch/vocabularies/core/>
    PREFIX schema: <http://schema.org/>
    PREFIX dct: <http://purl.org/dc/terms/>
    PREFIX dpv: <https://w3id.org/dpv#>

    INSERT {
      ${sparqlEscapeUri(itemListUri)} schema:itemListElement ${listItems.map((listItem) => sparqlEscapeUri(listItem.uri)).join(',')} .
      ${listItems.map((listItem) => listItem.triples).join('\n')}
    } WHERE {
      ?process a dpv:Process .
      ?process schema:hasPart ${sparqlEscapeUri(itemListUri)} .
    }
    `,
    { sudo: false },
    `Sparql query for adding ${fileUris.length} diagrams to itemList with uri ${sparqlEscapeUri(itemListUri)} of process failed.`,
  );
  console.log(
    `Added ${fileUris.length} files to listItem ${sparqlEscapeUri(itemListUri)}. (${listItems.map((listItem) => sparqlEscapeUri(listItem.uri)).join(', ')})`,
  );
}
