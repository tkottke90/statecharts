/**
 * XML Adapter - Wraps fast-xml-parser to provide simple-xml-to-json compatible output
 * 
 * This adapter transforms fast-xml-parser output to match the format expected by
 * the existing parser infrastructure, which was originally built for simple-xml-to-json.
 * 
 * Key transformations:
 * 1. Converts arrays of child elements to a "children" array
 * 2. Wraps text content in "content" property
 * 3. Handles CDATA sections (which simple-xml-to-json couldn't handle properly)
 * 4. Preserves attributes at the same level as other properties
 */

import { XMLParser } from 'fast-xml-parser';

/**
 * Transform fast-xml-parser output to simple-xml-to-json format
 */
function transformNode(node: any): any {
  if (node === null || node === undefined) {
    return node;
  }

  // Handle primitive values (strings, numbers, booleans)
  if (typeof node !== 'object') {
    return node;
  }

  // Handle arrays - transform each element
  if (Array.isArray(node)) {
    return node.map(transformNode);
  }

  const result: any = {};
  const children: any[] = [];

  // Process each property in the node
  for (const [key, value] of Object.entries(node)) {
    // Skip XML declaration
    if (key === '?xml') {
      continue;
    }

    // Handle CDATA content - prefer CDATA over text
    if (key === '__cdata') {
      result.content = value;
      continue;
    }

    // Handle text content
    if (key === '#text') {
      // Only set content if we don't already have CDATA content
      if (!('content' in result)) {
        result.content = value;
      }
      continue;
    }

    // Handle attributes (prefixed with @_) - strip prefix and merge into result
    if (key.startsWith('@_')) {
      const attrName = key.substring(2); // Remove @_ prefix
      result[attrName] = value;
      continue;
    }

    // Handle other primitive values
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
      continue;
    }

    // Handle child elements
    if (Array.isArray(value)) {
      // Multiple children with the same tag name
      for (const item of value) {
        const transformed = transformNode(item);
        children.push({
          [key]: transformed
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // Single child element
      const transformed = transformNode(value);
      children.push({
        [key]: transformed
      });
    }
  }

  // Add children array if we have any children
  if (children.length > 0) {
    result.children = children;
  }

  return result;
}

/**
 * Parse XML string and return simple-xml-to-json compatible format
 * 
 * This function mimics the SimpleXML.convertXML() API from simple-xml-to-json
 * but uses fast-xml-parser under the hood, which properly handles CDATA sections.
 * 
 * @param xmlStr - XML string to parse
 * @returns Parsed object in simple-xml-to-json format
 */
export function convertXML(xmlStr: string): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_', // Prefix attributes to avoid conflicts with element names
    textNodeName: '#text',
    cdataPropName: '__cdata', // Use separate property for CDATA
    ignoreDeclaration: false,
    parseTagValue: false, // Don't convert strings to numbers/booleans
    parseAttributeValue: false, // Don't convert attribute values
    trimValues: false, // Preserve whitespace
    processEntities: true, // Process XML entities like &lt; &gt;
    htmlEntities: false,
  });

  const parsed = parser.parse(xmlStr);

  // Transform to simple-xml-to-json format
  const transformed = transformNode(parsed);

  // If the result has a single "children" array with one element, unwrap it
  // This handles the case where the root element is wrapped
  if (transformed.children && transformed.children.length === 1 && Object.keys(transformed).length === 1) {
    return transformed.children[0];
  }

  return transformed;
}

/**
 * Default export for compatibility with simple-xml-to-json import style
 */
export default {
  convertXML
};

