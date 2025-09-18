# SCXML Schema for VSCode IntelliSense

This directory contains XML Schema Definition (XSD) files that provide IntelliSense, autocomplete, and validation support for SCXML files in Visual Studio Code.

## Features

The `scxml.xsd` schema provides:

### ✅ **IntelliSense & Autocomplete**
- Element suggestions as you type
- Attribute completion with valid values
- Nested element structure guidance
- Real-time syntax validation

### ✅ **Comprehensive SCXML Support**
- **Core Elements**: `<scxml>`, `<state>`, `<parallel>`, `<final>`, `<transition>`
- **Data Model**: `<datamodel>`, `<data>` with expression support
- **Actions**: `<onentry>`, `<onexit>` with executable content
- **Executable Content**: `<assign>`, `<raise>`, `<log>`, `<script>`
- **External Communication**: `<send>`, `<param>` with full attribute support
- **Conditional Logic**: `<if>`, `<elseif>`, `<else>`
- **Iteration**: `<foreach>` loops
- **History States**: `<history>` with shallow/deep types

### ✅ **Advanced Features**
- **Expression Attributes**: `expr`, `eventexpr`, `targetexpr`, `delayexpr`
- **External Communication**: HTTP processor support with `<send>` and `<param>`
- **Namelist Support**: For data model variable transmission
- **Delay Processing**: Time-based event scheduling
- **Error Handling**: Proper validation and error reporting

## Setup

### Prerequisites
Install the **XML Language Support** extension in VSCode:
1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "XML Language Support by Red Hat"
4. Install the extension

### Automatic Configuration
The schema is automatically configured for this project via `.vscode/settings.json`:

```json
{
  "xml.fileAssociations": [
    {
      "pattern": "**/*.scxml",
      "systemId": "./schemas/scxml.xsd"
    },
    {
      "pattern": "**/examples/*.xml",
      "systemId": "./schemas/scxml.xsd"
    }
  ]
}
```

### Manual Schema Association
For individual files, add this to the top of your SCXML file:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<scxml xmlns="http://www.w3.org/2005/07/scxml" 
       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
       xsi:schemaLocation="http://www.w3.org/2005/07/scxml ./schemas/scxml.xsd"
       version="1.0" 
       datamodel="ecmascript">
  <!-- Your SCXML content here -->
</scxml>
```

## Usage Examples

### Basic State Machine with IntelliSense
```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
  <datamodel>
    <data id="counter" expr="0"/>
  </datamodel>
  
  <state id="idle">
    <onentry>
      <log expr="'Entering idle state'"/>
    </onentry>
    
    <transition event="start" target="active">
      <assign location="counter" expr="counter + 1"/>
    </transition>
  </state>
  
  <state id="active">
    <transition event="stop" target="idle"/>
  </state>
</scxml>
```

### External Communication with HTTP
```xml
<scxml xmlns="http://www.w3.org/2005/07/scxml" version="1.0" datamodel="ecmascript">
  <state id="sendRequest">
    <onentry>
      <send event="apiCall" 
            target="https://api.example.com/data" 
            type="http"
            delay="1s">
        <param name="method" expr="'POST'"/>
        <param name="userId" expr="data.userId"/>
      </send>
    </onentry>
    
    <transition event="http.success" target="success"/>
    <transition event="error.communication" target="failed"/>
  </state>
</scxml>
```

## IntelliSense Features in Action

### 1. Element Completion
- Type `<` and see all available SCXML elements
- Context-aware suggestions (e.g., only executable content inside `<onentry>`)

### 2. Attribute Completion
- Type an attribute name and get valid values
- Required attributes are highlighted
- Expression attributes (`expr`, `eventexpr`) are properly supported

### 3. Validation
- Real-time error highlighting for invalid XML
- Schema validation for SCXML compliance
- Missing required attributes are flagged

### 4. Documentation
- Hover over elements and attributes for descriptions
- Schema-based help text for proper usage

## Supported SCXML Features

### Core State Machine Elements
- `<scxml>` - Root element with version, datamodel, initial attributes
- `<state>` - Basic and compound states with ID and initial
- `<parallel>` - Parallel state containers
- `<final>` - Final states
- `<transition>` - State transitions with event, cond, target
- `<initial>` - Initial state specification
- `<history>` - History states (shallow/deep)

### Data Model
- `<datamodel>` - Data model container
- `<data>` - Data variables with expr, src attributes

### Executable Content
- `<onentry>` / `<onexit>` - State entry/exit actions
- `<assign>` - Variable assignment with location, expr
- `<raise>` - Internal event generation with event, eventexpr
- `<log>` - Logging with label, expr
- `<script>` - Script execution with src support

### External Communication
- `<send>` - External event sending with:
  - `target` / `targetexpr` - Destination specification
  - `type` / `typeexpr` - Processor type (http, scxml)
  - `event` / `eventexpr` - Event name
  - `delay` / `delayexpr` - Scheduling delays
  - `id` / `idlocation` - Send ID management
  - `namelist` - Data model variable transmission
- `<param>` - Parameter passing with name, expr, location

### Conditional Logic
- `<if>` - Conditional execution with cond attribute
- `<elseif>` - Additional conditions
- `<else>` - Default case

### Iteration
- `<foreach>` - Loop iteration with array, item, index

## Troubleshooting

### Schema Not Working?
1. Ensure XML Language Support extension is installed
2. Check that `.vscode/settings.json` has correct file associations
3. Verify schema path is correct relative to workspace root
4. Restart VSCode after making changes

### No IntelliSense?
1. Make sure file has `.xml` or `.scxml` extension
2. Check that XML namespace is declared correctly
3. Verify schema location in file associations

### Validation Errors?
1. Check XML syntax (proper closing tags, quotes, etc.)
2. Ensure required attributes are present
3. Verify element nesting follows SCXML rules
4. Check that namespace declaration matches schema

## Benefits

✅ **Faster Development** - Autocomplete reduces typing and errors
✅ **Better Code Quality** - Real-time validation catches issues early  
✅ **Learning Aid** - IntelliSense helps discover available elements and attributes
✅ **Documentation** - Hover help provides context and usage information
✅ **Consistency** - Schema ensures proper SCXML structure across team
✅ **External Communication** - Full support for `<send>` and `<param>` elements

The schema makes SCXML development in VSCode as smooth as working with any modern IDE!
