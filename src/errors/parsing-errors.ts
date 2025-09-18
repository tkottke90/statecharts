

export class XMLParsingError extends Error {

  constructor(readonly metadata: Record<string, unknown>) {
    super('There were errors parsing the XML');

    this.name = 'XMLParsingError';
  }

  toJSON() {
    return {
      name: this.name,
      metadata: this.metadata,
      stack: this.stack,
      message: this.message
    }
  }
}