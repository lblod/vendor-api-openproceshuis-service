export type CreateProcessRequest = {
  '@id': string;
  title: string;
  description?: string;
  contact?: string;
  linkedInventoryProcess?: string;
  users?: Array<string>;
  diagrams?: Array<string>;
  attachments?: Array<string>;
};

export type PatchProcessRequest = {
  '@id': string;
  title?: string;
  description?: string;
  contact?: string;
  linkedInventoryProcess?: string;
  users?: Array<string>;
  diagrams?: Array<string>;
  attachments?: Array<string>;
};

export type PutProcessRequest = {
  '@id': string;
  title: string;
  description: string;
  contact: string;
  linkedInventoryProcess: string;
  users: Array<string>;
  diagrams: Array<string>;
  attachments: Array<string>;
};

export type BestuursEenheid = {
  id: string;
  uri: string;
  organizationGraphUri: string;
};
