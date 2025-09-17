/**
 * Trims leading whitespace from each line of an XML string.
 * @param xml
 * @returns
 */
export function trimXMLStarts(xml: string) {
  return xml
    .split('\n')
    .map(line => line.trimStart())
    .join('\n');
}
