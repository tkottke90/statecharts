export class BaseSCXMLError extends Error {
  constructor(
    message: string,
    readonly name: string = 'error.base',
    public metadata: Record<string, unknown> = {},
  ) {
    super(message);
  }

  static fromCatch(error: unknown) {
    // If the error is already a BaseSCXMLError, just return it
    if (error instanceof BaseSCXMLError) {
      return error;
    }

    // Otherwise, create a new BaseSCXMLError from the error
    const message: string =
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
        ? error.message
        : 'Unknown error';
    return new this(message, this.name);
  }
}
