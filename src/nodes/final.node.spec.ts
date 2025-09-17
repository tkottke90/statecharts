import { FinalNode } from './final.node';
import { InternalState } from '../models/internalState';
import SimpleXML from 'simple-xml-to-json';

describe('Node: <final>', () => {
  describe('#createFromJSON', () => {
    it('should create a FinalNode instance from XML', () => {
      // Arrange

      // Accepts XML and converts it to JSON
      const finalXML = `
        <final id="test"></final>
      `;

      const json = SimpleXML.convertXML(finalXML);

      // Act
      const { success, node, error } = FinalNode.createFromJSON(json);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(FinalNode);
    });

    it('should create a FinalNode instance from JSON', () => {
      // Arrange

      // Accepts already parsed JSON or custom json schema
      const finalJSON = {
        id: 'test',
      };

      // Act
      const { success, node, error } = FinalNode.createFromJSON(finalJSON);

      // Assert
      expect(error).toBeUndefined();
      expect(success).toBe(true);
      expect(node).toBeInstanceOf(FinalNode);
    });
  });

  describe('#mount', () => {
    it('should generate done.state.{parent_id} event when entering final state with parent', async () => {
      // Arrange
      const { node } = FinalNode.createFromJSON({
        id: 'playing.healthSystem.dead', // Has parent 'playing.healthSystem'
      });

      const initialState: InternalState = {
        data: {},
        _name: 'test-session',
        _sessionId: 'session-123',
      };

      // Act
      const result = await node!.mount(initialState);

      // Assert
      expect(result.state._pendingInternalEvents).toHaveLength(1);
      expect(result.state._pendingInternalEvents![0]).toEqual({
        name: 'done.state.playing.healthSystem',
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {},
      });

      // Should preserve original state data
      expect(result.state.data).toEqual(initialState.data);
      expect(result.state._name).toEqual(initialState._name);
      expect(result.state._sessionId).toEqual(initialState._sessionId);
    });

    it('should not generate done event for top-level final state', async () => {
      // Arrange
      const { node } = FinalNode.createFromJSON({
        id: 'terminated', // Top-level final state (no parent)
      });

      const initialState: InternalState = {
        data: {},
        _name: 'test-session',
        _sessionId: 'session-123',
      };

      // Act
      const result = await node!.mount(initialState);

      // Assert
      expect(result.state._pendingInternalEvents).toBeUndefined();

      // Should preserve original state data
      expect(result.state.data).toEqual(initialState.data);
      expect(result.state._name).toEqual(initialState._name);
      expect(result.state._sessionId).toEqual(initialState._sessionId);
    });

    it('should handle final state with single-segment ID (no parent)', async () => {
      // Arrange
      const { node } = FinalNode.createFromJSON({
        id: 'terminated', // Single segment ID (no parent)
      });

      const initialState: InternalState = {
        data: {},
        _name: 'test-session',
        _sessionId: 'session-123',
      };

      // Act
      const result = await node!.mount(initialState);

      // Assert
      expect(result.state._pendingInternalEvents).toBeUndefined();

      // Should preserve original state data
      expect(result.state.data).toEqual(initialState.data);
      expect(result.state._name).toEqual(initialState._name);
      expect(result.state._sessionId).toEqual(initialState._sessionId);
    });

    it('should generate done event for deeply nested final state', async () => {
      // Arrange
      const { node } = FinalNode.createFromJSON({
        id: 'game.playing.level1.boss.defeated', // Parent: 'game.playing.level1.boss'
      });

      const initialState: InternalState = {
        data: {},
        _name: 'test-session',
        _sessionId: 'session-123',
      };

      // Act
      const result = await node!.mount(initialState);

      // Assert
      expect(result.state._pendingInternalEvents).toHaveLength(1);
      expect(result.state._pendingInternalEvents![0]).toEqual({
        name: 'done.state.game.playing.level1.boss',
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {},
      });
    });

    it('should preserve existing pending events when adding done event', async () => {
      // Arrange
      const { node } = FinalNode.createFromJSON({
        id: 'playing.combat.victory',
      });

      const existingEvent = {
        name: 'existing.event',
        type: 'internal' as const,
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {},
      };

      const initialState: InternalState = {
        data: {},
        _name: 'test-session',
        _sessionId: 'session-123',
        _pendingInternalEvents: [existingEvent],
      };

      // Act
      const result = await node!.mount(initialState);

      // Assert
      expect(result.state._pendingInternalEvents).toHaveLength(2);
      expect(result.state._pendingInternalEvents![0]).toEqual(existingEvent);
      expect(result.state._pendingInternalEvents![1]).toEqual({
        name: 'done.state.playing.combat',
        type: 'internal',
        sendid: '',
        origin: '',
        origintype: '',
        invokeid: '',
        data: {},
      });
    });
  });
});
