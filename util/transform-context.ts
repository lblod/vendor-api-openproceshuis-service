import { uuid } from 'mu';

export function diagramsToContext(fileUris: Array<string>) {
  if (fileUris.length === 0) {
    return null;
  }

  const now = new Date().toISOString();
  const listNodeId = uuid();
  return {
    '@id': listNodeId,
    uuid: listNodeId,
    order: 'https://schema.org/ItemListUnordered',
    version: 'v0.0.0',
    created: now,
    modified: now,
    'diagram-list-items': fileUris.map((uri, index) => {
      const listItemNodeId = uuid();
      return {
        '@id': listItemNodeId,
        uuid: listItemNodeId,
        position: index + 1,
        diagramFile: uri,
        created: now,
        modified: now,
      };
    }),
  };
}

export function linksToContext(linkUrls: Array<string>) {
  if (linkUrls.length === 0) {
    return null;
  }

  const now = new Date().toISOString();
  return linkUrls.map((uri) => {
    const linkNodeId = uuid();
    const href = uri;
    return {
      '@id': linkNodeId,
      uuid: linkNodeId,
      label: href,
      href: href,
      modified: now,
    };
  });
}
