export type BestuursEenheid = {
  id: string;
  uri: string;
  organizationGraphUri: string;
};

export type EnrichedBody = {
  '@id': string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  '@context': any;
  [key: string]: null | string | number | Array<string>;
};

export type EnrichedBodyOptions = {
  versionNumberForDiagramList?: number;
};
