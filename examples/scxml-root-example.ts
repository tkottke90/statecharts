import { SCXMLNode } from '../src/nodes/scxml.node';
import { parse } from '../src/parser';

// Example 1: Creating SCXMLNode programmatically
console.log('=== Example 1: Creating SCXMLNode Programmatically ===');

const scxmlNode = new SCXMLNode({
  scxml: {
    content: '',
    children: [],
    version: '1.0',
    initial: 'idle',
    name: 'TrafficLight',
    datamodel: 'ecmascript'
  }
});

console.log('SCXML Node Properties:');
console.log(`- Version: ${scxmlNode.version}`);
console.log(`- Initial State: ${scxmlNode.initial}`);
console.log(`- Name: ${scxmlNode.name}`);
console.log(`- Data Model: ${scxmlNode.datamodel}`);
console.log(`- Label: ${scxmlNode.label}`);

// Example 2: Creating SCXMLNode from JSON
console.log('\n=== Example 2: Creating SCXMLNode from JSON ===');

const jsonInput = {
  scxml: {
    version: '1.0',
    initial: 'start',
    name: 'SimpleStateMachine',
    datamodel: 'null'
  }
};

const result = SCXMLNode.createFromJSON(jsonInput);

if (result.success && result.node) {
  console.log('Successfully created SCXMLNode from JSON:');
  console.log(`- Version: ${result.node.version}`);
  console.log(`- Initial State: ${result.node.initial}`);
  console.log(`- Name: ${result.node.name}`);
  console.log(`- Data Model: ${result.node.datamodel}`);
} else {
  console.log('Failed to create SCXMLNode:', result.error);
}

// Example 3: Parser integration
console.log('\n=== Example 3: Parser Integration ===');

const scxmlDocument = {
  scxml: {
    version: '1.0',
    initial: 'idle',
    name: 'MicrowaveOven',
    datamodel: 'ecmascript'
  }
};

const parseResult = parse(scxmlDocument);

if (parseResult.success && parseResult.rootNode) {
  console.log('Successfully parsed SCXML document:');
  console.log(`- Root Node Type: ${parseResult.rootNode.label}`);
  console.log(`- Root Node: ${parseResult.rootNode.constructor.name}`);
  
  if (parseResult.rootNode instanceof SCXMLNode) {
    console.log(`- SCXML Version: ${parseResult.rootNode.version}`);
    console.log(`- Initial State: ${parseResult.rootNode.initial}`);
    console.log(`- Machine Name: ${parseResult.rootNode.name}`);
    console.log(`- Data Model: ${parseResult.rootNode.datamodel}`);
  }
} else {
  console.log('Failed to parse SCXML document:', parseResult.errors);
}

// Example 4: Validation examples
console.log('\n=== Example 4: Validation Examples ===');

// Valid datamodel values
const validDatamodels = ['null', 'ecmascript', 'xpath'];
console.log('Testing valid datamodel values:');

validDatamodels.forEach(datamodel => {
  const testResult = SCXMLNode.createFromJSON({
    scxml: {
      version: '1.0',
      datamodel
    }
  });
  
  console.log(`- ${datamodel}: ${testResult.success ? '✅ Valid' : '❌ Invalid'}`);
});

// Invalid datamodel value
console.log('\nTesting invalid datamodel value:');
const invalidResult = SCXMLNode.createFromJSON({
  scxml: {
    version: '1.0',
    datamodel: 'python'
  }
});

console.log(`- python: ${invalidResult.success ? '✅ Valid' : '❌ Invalid'}`);
if (!invalidResult.success) {
  console.log(`  Error: ${invalidResult.error?.message}`);
}

// Example 5: W3C SCXML Compliance
console.log('\n=== Example 5: W3C SCXML Compliance ===');

console.log('According to W3C SCXML specification section 3.2.1:');
console.log('- datamodel attribute is OPTIONAL');
console.log('- Valid values: "null", "ecmascript", "xpath" or platform-defined');
console.log('- Default value is platform-specific');
console.log('- version attribute is REQUIRED with value "1.0"');
console.log('- initial and name attributes are OPTIONAL');

const compliantExample = new SCXMLNode({
  scxml: {
    content: '',
    children: [],
    version: '1.0',
    initial: 'ready',
    name: 'W3C_Compliant_StateMachine',
    datamodel: 'ecmascript'
  }
});

console.log('\nW3C Compliant SCXML Node created successfully! 🎉');
console.log(`This represents the root <scxml> element of an SCXML document.`);
