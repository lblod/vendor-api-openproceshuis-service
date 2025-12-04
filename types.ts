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
