import SimpleXML from 'simple-xml-to-json';
import { BaseNode } from "../models";
import { parse } from "./index";


const xml = `
<scxml initial="main">
  <state id="main">
    <transition event="*" target="send:channel"></transition>
  </state>
  <final id="send:channel"></final>
</scxml>
`.trimStart();


describe('Parser', () => {
  it('should parse a simple statechart', () => {
    const parsedFile = SimpleXML.convertXML(xml);

    if (!parsedFile.scxml) {
      throw new Error('Invalid Format: Root Element must be <scxml>');
    }

    const { root, identifiableChildren } = parse(parsedFile);

    expect(root).toBeInstanceOf(BaseNode);
    expect(identifiableChildren.size).toBe(2);
  });
});