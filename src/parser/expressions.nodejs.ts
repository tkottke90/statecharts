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
  const context = createContext(data);

  const result = runInContext(expression, context);
  return result; // Convert result to string for SCXML compatibility
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
