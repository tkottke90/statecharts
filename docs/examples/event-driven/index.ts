
import * as readline from 'readline';
import { readFileSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { InternalState, SCXMLEvent, StateChart } from '../../../dist/index.js';
import { chatAssistant, chatUser } from './draw';

const currentDir = __dirname;
const persistenceFilePath = path.join(currentDir, 'chat-state.json');

interface ChatMessage { role: string, content: string }

type LLM_Generate_Req = {
  model: string;
  prompt: string;
  format?: Record<string, string> | 'json';
}

type LLM_Response<MessageType> = 
  | { 
      success: true
      token: number,
      response: MessageType
    }
  | {
      success: false
      token: number
    }

type ChatResponse = LLM_Response<ChatMessage>
type GenerateResponse = LLM_Response<string>

const OLLAMA_BASE_URL = process.env.OLLAMA ?? 'http://localhost:11434'

const defaultInitialState = {
  data: {},
  _datamodel: 'ecmascript'
}

async function llmChat(model: string, messages: Array<{ role: string, content: string }>): Promise<ChatResponse> {
  return fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  })
    .then(async response => {
      if (!response.ok) {
        throw new Error('Failed to call Ollama')
      }

      const { eval_count, message } = await response.json();

      return {
        success: true as const,
        token: eval_count,
        response: message
      }
    }).catch((error) => {
      debugger;

      return {
        success: false as const,
        token: 0
      }
    })
}

async function llmGenerate(request: LLM_Generate_Req): Promise<GenerateResponse> {
  return fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })
    .then(async response => {
      if (!response.ok) {
        return {
          success: false,
          token: 0
        }
      }

      const { eval_count, message } = await response.json();

      return {
        success: true,
        token: eval_count,
        response: message
      }
    })
}


async function promptUser(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('You: ', (answer) => {
      // Clear the input line after user presses enter
      process.stdout.write('\x1b[1A'); // Move cursor up one line
      process.stdout.write('\x1b[2K'); // Clear the entire line

      rl.close();
      resolve(answer.trim());
    });
  });
}

function loadStateChart(): StateChart {
  // Step 1: Check for a `chat-state.json` file in the same directory as the `index.ts` file

  // Step 2: Load the JSON file if it is present
  let persistenceData: string | undefined;
  if (existsSync(persistenceFilePath)) {
    console.log('📖 Loading existing chat state from chat-state.json...');
    persistenceData = readFileSync(persistenceFilePath, 'utf-8');
  } else {
    console.log('📄 No existing chat state found, starting fresh');
  }

  // Step 3: Load the `statechart.xml` file
  const xmlPath = path.join(currentDir, 'statechart.xml');
  console.log('📋 Loading statechart from statechart.xml...');
  const xmlContent = readFileSync(xmlPath, 'utf-8');

  // Step 4: Create the statechart and include the persistence string if we loaded it in step 2
  const options = persistenceData ? { persistence: persistenceData } : {};

  // Step 5: Create and return the statechart
  const stateChart = StateChart.fromXML(xmlContent, options);
  console.log('✅ StateChart loaded successfully');

  return stateChart;
}

/**
 * Create a saving tool which will save the StateChart
 * to persistence only if an ongoing save is not in
 * progress.
 * @returns 
 */
function createStateChartSaver() {
  let activeSave: Promise<void> | undefined = undefined;

  return (stateChart: StateChart) => {
    if (!activeSave) {
      activeSave = writeFile(persistenceFilePath, JSON.stringify(stateChart, null, 2), 'utf-8')
        .then(() => {
          activeSave = undefined;
        })
    }
  }
}

async function* chat() {
  while(true) {
    // Get user input
    const userMessage = await promptUser();

    // Skip empty messages
    if (!userMessage) {
      continue;
    }

    // Yield the user message for processing
    yield { role: 'user', content: userMessage };
  }
}

async function* triggerStateChart(stateChart: StateChart) {
  while (true) {
    const result = await stateChart.execute({ data: {}, _datamodel: 'ecmascript' });

    // Yield the result for processing
    yield {
      currentState: stateChart.state,
      data: result.data
    }
  }
}

async function main() {
  console.log('  StateChart LLM Chat  ')
  console.log('=======================')
  console.log('')
  
  const statechart = loadStateChart();
  const saver = createStateChartSaver()

  statechart.on('history', (historyEvent) => {
    saver(statechart)
  })

  console.log('🤖 Chat with LLM');
  console.log('Type "exit" or "quit" to end the conversation\n');

  // Run the main loop until it is exited
  for await (const userMessage of chat()) {
    // Create message event
    statechart.addEvent({
      name: 'message',
      type: 'platform',
      sendid: '',
      origin: '',
      origintype: '',
      invokeid: '',
      data: userMessage
    })

    // Save the state after the user inputs a message
    saver(statechart);

    // Break the loop if the user chooses to exit
    if (userMessage.content.toLowerCase() === 'exit' || userMessage.content.toLowerCase() === 'quit') {
      break;
    }

    chatUser(userMessage.content);

    // Run the StateChart until it is stable
    for await (const { currentState, data } of triggerStateChart(statechart)) {
      saver(statechart);

      if (currentState.includes('callLLM')) {
        let result: LLM_Response<any>;

        if (data.mode === 'chat') {
          result = await llmChat(data.model as string, data.messages as ChatMessage[]);
        } else {
          result = await llmGenerate({
            model: data.model as string,
            prompt: data.currentMessage as string,

          })
        }

        if (result.success) {
          statechart.addEvent({
            name: 'callLLM.success',
            type: 'platform',
            sendid: '',
            origin: '',
            origintype: '',
            invokeid: '',
            data: result
          });

          chatAssistant(result.response.content);
        } else {
          statechart.addEvent({
            name: 'callLLM.error',
            type: 'platform',
            sendid: '',
            origin: '',
            origintype: '',
            invokeid: '',
            data: result
          });

          chatAssistant('There was an issue generating the chat')
        }
      }

      if (currentState.includes('active.sendMessage')) {
        // Send the final response to the user
        const finalResponse = data.finalResponse as string;

        if (finalResponse) {
          chatAssistant(finalResponse);
          console.debug('✓ Message sent to user:', finalResponse);
        } else {
          console.warn('⚠ No final response to send');
        }

        // Raise message.sent event to transition back to idle
        statechart.addEvent({
          name: 'message.sent',
          type: 'platform',
          sendid: '',
          origin: '',
          origintype: '',
          invokeid: '',
          data: {}
        });
      }

      if (currentState.includes('agents.planner.plannerProcessResponse')) {
        // Parse JSON response from planner, with fallback for invalid JSON
        const planResponse = data.planResponse as string;
        let parsedPlan: any;

        try {
          parsedPlan = JSON.parse(planResponse);
          console.debug('✓ Successfully parsed planner response as JSON');
        } catch (e) {
          // If not valid JSON, store as text plan
          console.debug('⚠ Planner response is not valid JSON, using fallback structure');
          parsedPlan = {
            steps: [planResponse],
            requiresData: false,
            complexity: 'unknown',
            reasoning: 'Plan provided as text'
          };
        }

        // Send completion event with parsed plan
        statechart.addEvent({
          name: 'agents.planner.plannerProcessResponse.complete',
          type: 'platform',
          sendid: '',
          origin: '',
          origintype: '',
          invokeid: '',
          data: {
            plan: parsedPlan
          }
        });
      }

      break;
    }
  }

  chatAssistant('Goodbye')
}

main().catch(error => {
  console.error(error);
});