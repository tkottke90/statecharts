const { convertXML } = require('../../dist/utils/xml-adapter.js');
const { readFileSync } = require('fs');
const path = require('path');

const x = convertXML(
  readFileSync(path.resolve(__dirname, './test.xml'), 'utf-8'),
);

console.log(JSON.stringify(x, null, 2));

// debugger;
