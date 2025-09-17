const { convertXML } = require('simple-xml-to-json');
const { readFileSync } = require('fs');

const x = convertXML(readFileSync('./test.xml', 'utf-8'));

console.log(JSON.stringify(x, null, 2));

// debugger;
