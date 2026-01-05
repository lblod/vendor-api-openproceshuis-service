export class HttpError extends Error {
  constructor(
    message: string,
    public status?: number,
    public description?: string,
  ) {
    super(message);

    if (!this.status) {
      this.status = 500;
    }
    if (!this.description) {
      this.description = null;
    }
    console.log('\n Http error: ', description ?? message);
  }

  static caughtErrorJsonResponse(error) {
    const title = error.message ?? 'An unexpected error occurred.';
    return {
      status: error.status ?? 500,
      title,
      detail: error.description,
    };
  }
}
