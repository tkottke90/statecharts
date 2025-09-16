import { StateChart } from "./statechart";
import { readFileSync } from 'fs';
import path from 'path';
import { InternalState } from './models/internalState';
import { BaseStateNode } from "./models/base-state";


describe('Integration Tests', () => {
  describe('Parallel State Integration', () => {
    // These test are for the <parallel> node and it's integration with the larger
    // state chart system.  We need to make sure that it fully processes when we
    // initialize the state chart

    const xmlStr = readFileSync(
      path.join(__dirname, 'test_utils', 'examples', 'parallel.xml'),
      'utf8'
    );

    let stateChart: StateChart;

    beforeEach(() => {
      stateChart = StateChart.fromXML(xmlStr);
    });

    describe('Simultaneous System Entry Test', () => {
      it('should create StateChart and have initial state set', async () => {
        // Arrange + Act
        const stateChart = StateChart.fromXML(xmlStr);

        // Assert
        // Check if initial state is set correctly
        const initial = (stateChart as unknown as { initial: string }).initial;
        expect(initial).toBe('gameRunning');

        // Check if states map is populated
        const states = (stateChart as unknown as { states: Map<string, unknown> }).states;
        expect(states.size).toBe(13);

        // Check if the initial state is loaded into the chain
        const chain = (stateChart as unknown as { activeStateChain: Array<[string, BaseStateNode]> })
        expect(chain.activeStateChain.length).toBe(8);
      });

      it('should enter all parallel regions simultaneously when state chart executes', async () => {
        // Arrange - Initial state for execution
        const initialState: InternalState = {
          _datamodel: 'ecmascript',
          data: {}
        };

        // Act - Execute the state chart (this will enter initial states)
        await stateChart.execute(initialState);

        // Assert - Check that the activeStateChain contains all parallel regions
        // We need to access private properties for testing
        const activeStateChain = (stateChart as unknown as { activeStateChain: Array<[string, unknown]> }).activeStateChain;
        const activePaths = activeStateChain.map(([path]) => path);

        // All parallel regions should be active simultaneously
        expect(activePaths).toContain('gameRunning');
        expect(activePaths).toContain('gameRunning.gameSystems');

        // Health System should be active in initial state
        expect(activePaths).toContain('gameRunning.gameSystems.healthSystem');
        expect(activePaths).toContain('gameRunning.gameSystems.healthSystem.healthy');

        // Score System should be active in initial state
        expect(activePaths).toContain('gameRunning.gameSystems.scoreSystem');
        expect(activePaths).toContain('gameRunning.gameSystems.scoreSystem.scoring');

        // Power-up System should be active in initial state
        expect(activePaths).toContain('gameRunning.gameSystems.powerUpSystem');
        expect(activePaths).toContain('gameRunning.gameSystems.powerUpSystem.noPowerUp');
      });

      it('should initialize data model correctly across all parallel systems', async () => {
        // Arrange
        const initialState: InternalState = {
          _datamodel: 'ecmascript',
          data: {}
        };

        // Act
        const resultState = await stateChart.execute(initialState);

        // Assert - Initial data values should be set correctly
        expect(resultState.data.playerHealth).toBe(100);
        expect(resultState.data.playerScore).toBe(0);
        expect(resultState.data.gameTime).toBe(0);
        expect(resultState.data.powerUpActive).toBe(false);
      });

      it('should have all three parallel regions in activeStateChain using flattened multi-path approach', async () => {
        // Arrange
        const initialState: InternalState = {
          _datamodel: 'ecmascript',
          data: {}
        };

        // Act
        await stateChart.execute(initialState);

        // Assert - activeStateChain should contain paths for all parallel regions
        // This tests our flattened multi-path approach
        const activeStateChain = (stateChart as unknown as { activeStateChain: Array<[string, unknown]> }).activeStateChain;
        const activePaths = activeStateChain.map(([path]) => path);

        // Verify that all three systems are truly concurrent (not sequential)
        const expectedParallelPaths = [
          'gameRunning.gameSystems.healthSystem.healthy',
          'gameRunning.gameSystems.scoreSystem.scoring',
          'gameRunning.gameSystems.powerUpSystem.noPowerUp'
        ];

        // All parallel regions should be active at the same time
        expectedParallelPaths.forEach(statePath => {
          expect(activePaths).toContain(statePath);
        });

        // Verify we have the expected number of active states (flattened approach)
        // Should have: gameRunning + gameSystems + 3 parallel regions + 3 child states = 8 total
        expect(activePaths.length).toBe(8);
      });
    });

  })
})