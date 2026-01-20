import { update } from 'mu';
import { HttpError } from './http-error';

export async function updateQueryWithCatch(
  queryString: string,
  options = {},
  errorMessage?: string,
  object?: object,
) {
  try {
    await update(queryString, options);
  } catch (error) {
    throw new HttpError(error, 500, errorMessage, object);
  }
}
