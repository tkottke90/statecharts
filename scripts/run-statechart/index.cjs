const path = require('path');
const fs = require('fs');
const { StateChart } = require('../../dist');

function usage() {
  console.log('Usage: node run-statechart/index.cjs <path to xml file>');
}

function loadStateChart(filePath) {
  console.log('');
  console.log('-- Loading XML --');
  console.log('  File: ' + filePath);

  const xmlStr = fs.readFileSync(path.resolve(filePath), 'utf-8');

  console.log('');
  console.log('-- Loading Statechart --');
  return StateChart.fromXML(xmlStr);
}

async function main() {
  console.clear();
  console.log('== Statechart Tester ==');
  console.log('');

  if (process.argv.length < 3) {
    usage();
    process.exit(1);
  }

  const [, , /* node */ /* run-statechart/index.cjs */ xmlFilePath] =
    process.argv;

  let statechart;
  try {
    statechart = loadStateChart(xmlFilePath);
    console.log('  ✅ Statechart Loaded Successfully\n');
  } catch (error) {
    console.log('  ❌ Error Loading Statechart\n');

    console.error(error);

    process.exit(2);
  }

  console.log('-- Triggering Statechart --');
  console.log('');

  console.log('> Logs:');
  try {
    const result = await statechart.execute({
      data: {},
    });

    console.log('');
    console.log('  ✅ Statechart Stable\n');
    console.log(' History:');
    console.table(
      statechart
        .getHistory()
        .getAllEntries()
        .map((entry, index) => {
          return {
            id: entry.id,
            type: entry.type,
            state: entry.stateConfiguration.join(','),
            event: entry.event?.name ?? undefined,
          };
        }),
    );

    debugger;

    console.log('\n Current State:');
    console.log('===============\n');
    console.dir(JSON.stringify(result, null, 2));

    console.log('');
  } catch (error) {
    console.log('  ❌ Error Triggering Statechart\n');

    console.error(error);

    process.exit(2);
  }
}

main();
