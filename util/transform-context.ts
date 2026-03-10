import { uuid } from 'mu';

export function diagramsToContext(fileUris: Array<string>, versionNumber = 0) {
  if (!fileUris || fileUris.length === 0) {
    return null;
  }

  const now = new Date().toISOString();
  const listNodeId = uuid();
  return {
    type: 'DiagramList',
    '@id': listNodeId,
    uuid: listNodeId,
    order: 'https://schema.org/ItemListUnordered',
    version: `v0.0.${versionNumber}`,
    created: now,
    modified: now,
    'diagram-list-items': fileUris.map((uri, index) => {
      const listItemNodeId = uuid();
      return {
        type: 'DiagramListItem',
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
  if (!linkUrls || linkUrls.length === 0) {
    return null;
  }

  const now = new Date().toISOString();
  return linkUrls.map((uri) => {
    const linkNodeId = uuid();
    const href = uri;
    return {
      type: 'Bookmark',
      '@id': linkNodeId,
      uuid: linkNodeId,
      label: href,
      href: href,
      modified: now,
    };
  });
}
