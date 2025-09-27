## Script: StateChart Tester

This script helps me evaluate a statechart file to make sure it behaves the way I want it too.

## Triggering It

To trigger it in this repository you can use the NPM command I added to the package.json file:

```sh
npm run test:statechart -- <xml file path>
```

Example:

```sh
npm run test:statechart -- ./examples/basic-ollama.xml
```

## Output Format

The output will be rendered to console log and is broken up into sections

```
== Statechart Tester ==


-- Loading XML --
  File: ./examples/basic-ollama.xml


-- Loading Statechart --
  ✅ Statechart Loaded Successfully
== Statechart Tester ==


-- Loading XML --
  File: ./examples/basic-ollama.xml


-- Loading Statechart --
  ✅ Statechart Loaded Successfully

-- Triggering Statechart --
  ✅ Statechart Stable

 History:
    1. macrostep_start
    2. macrostep_end

 Current State:
{
  message: 'Hey hows it going?',
  ollamaUrl: 'http://10.0.0.6:11434/api/generate',
  model: 'mistral:7b',
  sendId: '',
  response: null,
  evalCount: 0,
  error: null
}
```

Each Section has a header (`-- <header> --`) and then contains information about that section and that is followed by details from that section on what was done and what the results were.

```
-- Loading Statechart --
  ✅ Statechart Loaded Successfully
```

As an example, this section outlines that the statechart was loaded without issue.

```
-- Triggering Statechart --
  ✅ Statechart Stable

 History:
    1. macrostep_start
    2. macrostep_end

 Current State:
{
  message: 'Hey hows it going?',
  ollamaUrl: 'http://10.0.0.6:11434/api/generate',
  model: 'mistral:7b',
  sendId: '',
  response: null,
  evalCount: 0,
  error: null
}
```

This section shows the StateChart was triggered, what the history of the StateChart is and what the current data model looks like
