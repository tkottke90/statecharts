import { evaluateExpression } from './expressions.nodejs';
import { InternalState } from '../models/internalState';

describe('Parser: Expression Evaluation', () => {
  it('should evaluate simple expressions', () => {
    // Arrange
    const expression = '2 + 2';
    const state: InternalState = {
      _datamodel: 'ecmascript',
      data: {},
    };

    // Act
    const result = evaluateExpression(expression, state);

    // Assert
    expect(result).toBe(4);
  });

  it('should return empty string for null datamodel', () => {
    // Arrange
    const expression = '2 + 2';
    const state: InternalState = {
      _datamodel: 'null',
      data: {},
    };

    // Act
    const result = evaluateExpression(expression, state);

    // Assert
    expect(result).toBe('');
  });

  it('should throw error for xpath datamodel', () => {
    // Arrange
    const expression = '2 + 2';
    const state: InternalState = {
      _datamodel: 'xpath',
      data: {},
    };

    // Act & Assert
    expect(() => evaluateExpression(expression, state)).toThrow(
      'XPath is not supported',
    );
  });

  it('should throw error for unsupported datamodel', () => {
    // Arrange
    const expression = '2 + 2';
    const state: InternalState = {
      _datamodel: 'python',
      data: {},
    };

    // Act & Assert
    expect(() => evaluateExpression(expression, state)).toThrow(
      'Unsupported datamodel',
    );
  });

  describe('Data Types', () => {
    it('should return "true" when evaluating a boolean', () => {
      // Arrange
      const expression = '1 === 1';
      const state: InternalState = {
        _datamodel: 'ecmascript',
        data: {},
      };

      // Act
      const result = evaluateExpression(expression, state);

      // Assert
      expect(result).toBe(true);
    });

    it('should return "false" when evaluating a boolean', () => {
      // Arrange
      const expression = '1 === 2';
      const state: InternalState = {
        _datamodel: 'ecmascript',
        data: {},
      };

      // Act
      const result = evaluateExpression(expression, state);

      // Assert
      expect(result).toBe(false);
    });
  });
});
