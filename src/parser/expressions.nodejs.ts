/* eslint-disable @typescript-eslint/no-unused-vars */
import { runInContext, createContext } from 'node:vm';
import { InternalState } from '../models/internalState';
import { BaseSCXMLError } from '../errors';

class SCXMLExpressionError extends BaseSCXMLError {
  constructor(message: string, name: string = '') {
    super(message, `error.expression${name ? `.${name}` : ''}`);
  }
}

export const evaluateNullDataModelExpression = (
  _expression: string,
  _data: InternalState,
) => {
  return '';
};

export const evaluateEcmascriptExpression = (
  expression: string,
  data: InternalState,
) => {
  // Create a restricted sandbox for SCXML expressions
  const sandbox = {
    // Include the state data
    data: data.data,
    _event: data._event,
    _name: data._name,
    _sessionId: data._sessionId,
    
    // Safe built-ins for expressions
    Math: Math,
    Date: Date,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Array: Array,
    Object: Object,
    
    // Explicitly undefined dangerous globals
    require: undefined,
    process: undefined,
    fetch: undefined,
    import: undefined,
    eval: undefined,
    Function: undefined,
    global: undefined,
    globalThis: undefined
  };


  const context = createContext(sandbox, {
    codeGeneration: {
      strings: false,  // Prevent eval and Function constructor
      wasm: false
    }
  });

  try {
    const result = runInContext(expression, context, {
      timeout: 1000,  // 1 second timeout
      displayErrors: false
    });
    return result;
  } catch (error) {
    // Handle errors appropriately for your use case
    throw new SCXMLExpressionError(
      'Expression evaluation failed',
      'evaluation-error'
    );
  }
};

export const evaluateExpression = (expression: string, data: InternalState) => {
  // Default to 'ecmascript' if _datamodel is not set
  const datamodel = data._datamodel || 'ecmascript';

  switch (datamodel) {
    case 'null': {
      return evaluateNullDataModelExpression(expression, data);
    }
    case 'ecmascript': {
      return evaluateEcmascriptExpression(expression, data);
    }
    case 'xpath': {
      throw new SCXMLExpressionError(
        'XPath is not supported',
        'xpath-not-supported',
      );
    }
    default: {
      throw new SCXMLExpressionError(
        'Unsupported datamodel',
        'unsupported-datamodel-value',
      );
    }
  }
};
