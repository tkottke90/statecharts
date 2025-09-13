import SimpleXML from 'simple-xml-to-json';
import { BaseNode, Node } from "../models";
import { parse } from "./index";
import { BaseStateNode } from '../models/base-state';

const xml = `
<state id="healthSystem">
  <initial>
    <transition target="substate"></transition>
  </initial>

  <state id="healthy"></state>
  <state id="looking-hurt"></state>
  <state id="unconscious"></state>
  <state id="dead"></state>

   
  <final id="game-over"></final>
</state>
`.trimStart();

describe('Parser', () => {
  it('should parse a simple xml structure', () => {
    // Arrange
    const parsedFile = SimpleXML.convertXML(xml);

    // Act
    const { root, identifiableChildren } = parse(parsedFile);

    // Assert
    expect(root).toBeInstanceOf(BaseStateNode);
    expect(identifiableChildren.size).toBe(5);
  });
});