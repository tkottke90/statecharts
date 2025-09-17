# SCXML Node

The `<scxml>` element is the root element of an SCXML document and represents the top-level state machine container. It defines the overall configuration and metadata for the state machine.

## Overview

The SCXML node serves as the document root and container for all other state machine elements. It specifies the SCXML version, datamodel type, initial state, and optional name for the state machine.

## Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `version` | `"1.0" \| "1.1"` | No | `"1.0"` | SCXML specification version |
| `datamodel` | `"null" \| "ecmascript" \| "xpath"` | No | `"ecmascript"` | Data model implementation |
| `initial` | `string` | No | `""` | ID of the initial state |
| `name` | `string` | No | `""` | Optional name for the state machine |

### Version

Specifies which version of the SCXML specification this document conforms to:
- `"1.0"` - SCXML 1.0 specification (default)
- `"1.1"` - SCXML 1.1 specification

### Datamodel

Defines the data model implementation used for data manipulation and expression evaluation:
- `"null"` - No data model (expressions not supported)
- `"ecmascript"` - ECMAScript/JavaScript data model.  All `expr` and `cond` attributes will be processed as javascript
- `"xpath"` - XPath data model (Not Supported - Future)

### Initial

Specifies the ID of the state that should be entered when the state machine starts. If not specified, the state machine will need to determine the initial state through other means.

### Name

An optional human-readable name for the state machine, useful for debugging and documentation purposes.

## Usage Examples

### Basic SCXML Document

```xml
<?xml version="1.0" encoding="UTF-8"?>
<scxml version="1.0" datamodel="ecmascript" initial="idle">
  <state id="idle">
    <transition event="start" target="active"/>
  </state>
  
  <state id="active">
    <transition event="stop" target="idle"/>
  </state>
</scxml>
```

### With Data Model

```xml
<?xml version="1.0" encoding="UTF-8"?>
<scxml version="1.1" datamodel="ecmascript" initial="main" name="MyStateMachine">
  <datamodel>
    <data id="counter" expr="0"/>
    <data id="message">Hello World</data>
  </datamodel>
  
  <state id="main">
    <transition event="increment" target="main">
      <assign location="counter" expr="counter + 1"/>
    </transition>
  </state>
</scxml>
```

### Minimal Configuration

```xml
<scxml>
  <state id="default">
    <!-- State content -->
  </state>
</scxml>
```

## TypeScript Usage

### Creating an SCXML Node

```typescript
import { SCXMLNode } from '@your-library/statecharts';

// Minimal configuration
const scxmlNode = new SCXMLNode({
  scxml: {
    content: '',
    children: [],
    version: '1.0',
    datamodel: 'ecmascript'
  }
});

// Full configuration
const fullScxmlNode = new SCXMLNode({
  scxml: {
    content: '',
    children: [],
    version: '1.1',
    initial: 'startState',
    name: 'MyStateMachine',
    datamodel: 'ecmascript'
  }
});
```

### Creating from JSON

```typescript
// From parsed XML/JSON
const result = SCXMLNode.createFromJSON({
  scxml: {
    version: '1.0',
    initial: 'idle',
    name: 'TestMachine',
    datamodel: 'ecmascript'
  }
});

if (result.success) {
  const scxmlNode = result.node;
  console.log(`Created: ${scxmlNode.name} v${scxmlNode.version}`);
} else {
  console.error('Validation failed:', result.error);
}
```

## Properties

The SCXMLNode class exposes the following readonly properties:

- `initial: string` - The initial state ID
- `name: string` - The state machine name
- `version: SCXMLVersion` - The SCXML version ("1.0" or "1.1")
- `datamodel: SCXMLDataModel` - The datamodel type

## Validation

The SCXML node performs strict validation on its attributes:

- **Version**: Must be exactly "1.0" or "1.1"
- **Datamodel**: Must be "null", "ecmascript", or "xpath"
- **Initial**: Optional string, no format restrictions
- **Name**: Optional string, no format restrictions

Invalid values will cause `createFromJSON()` to return a validation error.

## SCXML Specification

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/). The `<scxml>` element is defined in [Section 3.2](https://www.w3.org/TR/scxml/#scxml) of the specification.

## See Also

- [State Node](./state.md) - For defining individual states
- [DataModel Node](./datamodel.md) - For data model configuration
- [Transition Node](./transition.md) - For state transitions
