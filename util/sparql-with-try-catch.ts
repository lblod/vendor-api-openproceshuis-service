import { update } from 'mu';
import { HttpError } from './http-error';

export async function updateQueryWithCatch(
  queryString: string,
  options = {},
  errorMessage?: string,
) {
  try {
    await update(queryString, options);
  } catch (error) {
    console.log(`Sparql query fail with raw error: ${error}`);
    throw new HttpError(
      'Something went wrong while executing an update query.',
      500,
      errorMessage,
    );
  }
}
