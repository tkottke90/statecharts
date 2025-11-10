# Statecharts

A comprehensive TypeScript implementation of the [W3C SCXML specification](https://www.w3.org/TR/scxml/) for building robust, event-driven state machines. Define complex state machine logic using XML and execute it with full SCXML compliance in Node.js applications.

## ✨ Features

- 🎯 **SCXML Compliant** - Full implementation of W3C SCXML specification
- 🔧 **TypeScript Support** - Complete type safety with comprehensive TypeScript definitions
- 🚀 **Easy Integration** - Simple 4-step setup process for quick adoption
- 📊 **Event-Driven** - Robust event processing with internal/external event queues
- 🏗️ **Hierarchical States** - Support for nested states, parallel states, and state history
- 💾 **Data Management** - Built-in data model with expression evaluation
- 🧪 **Well Tested** - Comprehensive test coverage with Jest
- 📚 **Extensive Documentation** - Complete API documentation and examples

## 🚀 Quick Start

### Installation

```bash
npm install statecharts
```

**Requirements:**

- Node.js >= 20.0.0
- TypeScript (recommended)

### Basic Usage

```typescript
import { StateChart } from 'statecharts';

// Define your state machine in XML
const xmlString = `
  <scxml version="1.0" datamodel="ecmascript" initial="idle">
    <datamodel>
      <data id="counter" expr="0"/>
    </datamodel>

    <state id="idle">
      <transition event="start" target="active"/>
    </state>

    <state id="active">
      <onentry>
        <assign location="counter" expr="counter + 1"/>
      </onentry>
      <transition event="stop" target="idle"/>
    </state>
  </scxml>
`;

// Parse and execute
const stateChart = StateChart.fromXML(xmlString);
const result = await stateChart.execute({
  data: {},
  _datamodel: 'ecmascript',
});

console.log('State machine result:', result.data);
// Output: { counter: 1 }
```

## ✅ Validating SCXML Files

The library includes a utility CLI tool for validating SCXML files with three layers of validation:

### Quick Validation

```bash
# Validate a single file
npx @tkottke90/statecharts validate --file path/to/your-statechart.xml

# Watch mode - continuously validate on file changes
npx @tkottke90/statecharts validate --file path/to/your-statechart.xml --watch

# JSON output for CI/CD integration
npx @tkottke90/statecharts validate --file path/to/your-statechart.xml --json
```

### Validation Layers

The validator performs three levels of validation:

1. **XML Syntax Validation** - Catches basic XML errors (unclosed tags, invalid characters)
2. **XSD Schema Validation** - Validates against SCXML schema (required attributes, valid elements)
3. **SCXML Semantic Validation** - Validates statechart logic (state references, initial states)

### Example Output

**Valid SCXML:**
```
🔍 Validating: my-statechart.xml

============================================================

📝 Step 1: XML Syntax Validation...
✅ XML syntax is valid

📋 Step 2: XSD Schema Validation...
✅ XSD schema validation passed

🔧 Step 3: SCXML Semantic Validation...
✅ SCXML semantic validation passed

============================================================

✅ All validations passed!
```

**Invalid SCXML:**
```
❌ XSD Schema Validation Failed:
Element 'scxml': The attribute 'version' is required but missing.
```

### JSON Output for CI/CD

```bash
npx @tkottke90/statecharts validate --file my-file.xml --json
```

```json
{
  "valid": true,
  "file": "my-file.xml",
  "timestamp": "2025-11-10T02:37:29.393Z",
  "layers": {
    "syntax": { "valid": true },
    "schema": { "valid": true },
    "semantic": { "valid": true }
  }
}
```

### Global Installation

For frequent use, install globally:

```bash
npm install -g @tkottke90/statecharts
statecharts validate --file my-file.xml
```

### Requirements

- **xmllint** (optional) - For XSD schema validation. Available by default on macOS/Linux. If not available, schema validation will be skipped.

## 📚 Documentation

### Getting Started

- **[Getting Started Guide](./docs/Getting_Started.md)** - Complete walkthrough from installation to execution

### Core Documentation

- **[SCXML Nodes](./src/nodes/README.md)** - Complete reference for all SCXML elements
- **[Model Classes](./src/models/README.md)** - Understanding the underlying architecture
- **[Error Handling](./src/errors/Errors.md)** - Comprehensive error handling guide

### Node Reference

- **[State Node](./src/nodes/state.md)** - Individual states and state hierarchies
- **[Transition Node](./src/nodes/transition.md)** - State transitions and conditions
- **[Parallel Node](./src/nodes/parallel.md)** - Concurrent state processing
- **[SCXML Node](./src/nodes/scxml.md)** - Root state machine container
- **[Data Management](./src/nodes/datamodel.md)** - Working with data models
- **[Executable Content](./src/nodes/assign.md)** - Variable assignment and actions

### Advanced Topics

- **[OnEntry/OnExit Actions](./src/nodes/onentry.md)** - State lifecycle management
- **[Event Generation](./src/nodes/raise.md)** - Internal event creation
- **[Final States](./src/nodes/final.md)** - Terminal state handling

## 🏗️ Architecture

The library is built on a solid foundation of TypeScript classes that implement the SCXML specification:

```
StateChart (Main API)
├── BaseNode (Foundation for all SCXML elements)
│   ├── BaseStateNode (State-like elements)
│   │   ├── StateNode, ParallelNode, FinalNode
│   └── BaseExecutableNode (Executable content)
│       ├── AssignNode, RaiseNode, DataNode
│       └── OnEntryNode, OnExitNode
├── EventQueue (FIFO/LIFO event processing)
└── InternalState (Immutable state management)
```

## 🎯 Use Cases

Perfect for applications that need:

- **Workflow Management** - Complex business process automation
- **Game State Management** - Character states, game phases, UI states
- **Protocol Implementation** - Network protocols, communication flows
- **User Interface Logic** - Multi-step forms, wizards, navigation
- **IoT Device Control** - Device state management and automation
- **API Orchestration** - Service coordination and error handling

## 🔧 Advanced Features

### Parallel State Processing

```xml
<parallel id="multimedia">
  <state id="audio">
    <transition event="mute" target="muted"/>
  </state>
  <state id="video">
    <transition event="pause" target="paused"/>
  </state>
</parallel>
```

### Data Model Integration

```xml
<datamodel>
  <data id="user" expr="{ name: 'John', role: 'admin' }"/>
  <data id="sessionTimeout" expr="30 * 60 * 1000"/>
</datamodel>
```

### Event-Driven Transitions

```xml
<state id="waiting">
  <transition event="success" target="completed"/>
  <transition event="error.*" target="failed"/>
  <transition event="timeout" target="expired"/>
</state>
```

## 🧪 Testing

The library includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test -- --coverage
```

## 📖 Standards Compliance

This implementation follows the [W3C SCXML specification](https://www.w3.org/TR/scxml/) and includes:

- ✅ **Core Constructs** - States, transitions, events, data model
- ✅ **Executable Content** - Variable assignment, event raising, conditionals
- ✅ **Advanced Features** - Parallel states, history states, error handling
- ✅ **Event Processing** - Internal/external event queues with proper prioritization
- ✅ **Data Model** - ECMAScript data model with expression evaluation

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Report Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/your-repo/statecharts/issues) with:

- Clear description of the problem or feature
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Code examples when applicable

### 🔧 Submit Pull Requests

Ready to contribute code? Great! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes with tests
4. Ensure all tests pass (`npm test`)
5. Follow the existing code style (`npm run format`)
6. Submit a pull request with a clear description

### 📝 Improve Documentation

Help make the documentation better:

- Fix typos or unclear explanations
- Add more examples
- Improve existing guides
- Create new tutorials

### 🧪 Add Tests

Help improve test coverage:

- Add unit tests for new features
- Create integration tests
- Add edge case testing
- Improve existing test clarity

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built according to the [W3C SCXML Specification](https://www.w3.org/TR/scxml/)

---

**Ready to get started?** Check out the [Getting Started Guide](./docs/Getting_Started.md) for a complete walkthrough!
