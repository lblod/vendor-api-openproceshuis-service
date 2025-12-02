import { Request } from 'express';
import { HttpError } from '../util/http-error';

export class AuthRequest {
  static fromRequest(request: Request) {
    const HEADER_MU_SESSION_ID = 'mu-session-id';
    const sessionUri = request.get(HEADER_MU_SESSION_ID);

    if (!sessionUri) {
      throw new HttpError(
        'Missing session header',
        401,
        `The session header '${HEADER_MU_SESSION_ID}' was not found in the request headers.`,
      );
    }
  }
}
