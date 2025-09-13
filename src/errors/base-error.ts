

export class BaseSCXMLError extends Error {
  constructor(
    message: string,
    readonly name: string = 'error.base'
  ) {
    super(message);
  }

  static fromCatch(error: unknown) {
    const message: string = (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string')
      ? error.message
      : 'Unknown error';
    return new this(message, this.name);
  }
}