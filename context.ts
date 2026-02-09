export const processContext = {
  '@version': 1.1,
  type: '@type',
  Process: 'https://w3id.org/dpv#Process',
  title: {
    '@id': 'http://purl.org/dc/terms/title',
    '@type': 'http://www.w3.org/2001/XMLSchema#string',
  },
  description: {
    '@id': 'http://purl.org/dc/terms/description',
    '@type': 'http://www.w3.org/2001/XMLSchema#string',
  },
  email: {
    '@id': 'https://schema.org/email',
    '@type': 'http://www.w3.org/2001/XMLSchema#string',
  },
  created: {
    '@id': 'http://purl.org/dc/terms/created',
    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
  },
  modified: {
    '@id': 'http://purl.org/dc/terms/modified',
    '@type': 'http://www.w3.org/2001/XMLSchema#dateTime',
  },
  status: {
    '@id': 'http://www.w3.org/ns/adms#status',
    '@type': '@id',
  },
  'is-blueprint': {
    '@id':
      'http://lblod.data.gift/vocabularies/informationclassification/isBlueprint',
    '@type': 'http://www.w3.org/2001/XMLSchema#boolean',
  },
  publisher: {
    '@id': 'http://purl.org/dc/terms/publisher',
    '@type': '@id',
    '@context': {
      Bestuurseenheid: 'http://data.vlaanderen.be/ns/besluit#Bestuurseenheid',
    },
  },
  'linked-concept': {
    '@id': 'http://purl.org/dc/terms/source',
    '@type': '@id',
    '@context': {
      ConceptueelProces:
        'http://lblod.data.gift/vocabularies/openproceshuis/ConceptueelProces',
    },
  },
  diagrams: {
    '@reverse':
      'http://www.semanticdesktop.org/ontologies/2007/01/19/nie#isPartOf',
    '@container': '@set',
    '@type': '@id',
    '@context': {
      FileDataObject:
        'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject',
    },
  },
  attachments: {
    '@reverse':
      'http://www.semanticdesktop.org/ontologies/2007/01/19/nie#isPartOf',
    '@container': '@set',
    '@type': '@id',
    '@context': {
      FileDataObject:
        'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#FileDataObject',
    },
  },
  'ipdc-products': {
    '@reverse': 'http://purl.org/vocab/cpsv#follows',
    '@container': '@set',
  },
  'relevant-administrative-units': {
    '@id':
      'http://lblod.data.gift/vocabularies/informationclassification/isRelevantForAdministrativeUnit',
    '@type': '@id',
    '@container': '@set',
    '@context': {
      BestuurseenheidClassificatieCode:
        'http://lblod.data.gift/vocabularies/organisatie/BestuurseenheidClassificatieCode',
    },
  },
  'information-assets': {
    '@id':
      'http://lblod.data.gift/vocabularies/informationclassification/hasInformationAsset',
    '@type': '@id',
    '@container': '@set',
    '@context': {
      Concept: 'http://www.w3.org/2004/02/skos/core#Concept',
    },
  },
  'linked-blueprints': {
    '@id': 'http://www.w3.org/ns/prov#wasInfluencedBy',
    '@type': '@id',
    '@container': '@set',
    '@context': {
      Process: 'https://w3id.org/dpv#Process',
    },
  },
  users: {
    '@id': 'http://www.w3.org/ns/prov#usedBy',
    '@type': '@id',
    '@container': '@set',
    '@context': {
      Bestuurseenheid: 'http://data.vlaanderen.be/ns/besluit#Bestuurseenheid',
    },
  },
  links: {
    '@id': 'http://www.w3.org/2000/01/rdf-schema#seeAlso',
    '@type': '@id',
    '@container': '@set',
    '@context': {
      Bookmark:
        'http://www.semanticdesktop.org/ontologies/2007/03/22/nfo#Bookmark',
    },
  },
};
