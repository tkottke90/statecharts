const path = require('path');
const fs = require('fs');
const { StateChart } = require('../../dist');

function usage() {

}

const [
  /* node */,
  /* run-statechart/index.cjs */,
  xmlFilePath
] = process.argv;

const xmlStr = fs.readFileSync(
  path.resolve(xmlFilePath),
  'utf-8'
);

const stateChart = StateChart.fromXML(xmlStr)

console.log(stateChart)