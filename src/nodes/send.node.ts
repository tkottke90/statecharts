import z from 'zod';
import { BaseExecutableNode } from '../models/base-executable';
import { CreateFromJsonResponse } from '../models/methods';
import { addPendingEvent, fromJsError, InternalState, SCXMLEvent } from '../models/internalState';
import { evaluateExpression } from '../parser/expressions.nodejs';
import { defaultProcessorRegistry, EventIOProcessorRegistry } from '../models/event-io-processor';
import { ParamNode, collectParamValues } from './param.node';
import _ from 'lodash';

/**
 * Zod schema for SendNode attributes
 * 
 * The <send> element is used to send events to external targets,
 * other state machine instances, or back to the current state machine.
 */
const SendNodeAttr = BaseExecutableNode.schema.extend({
  event: z.string().optional(), // Event name (mutually exclusive with eventexpr)
  eventexpr: z.string().optional(), // Expression to evaluate for event name
  target: z.string().optional(), // Target URI (mutually exclusive with targetexpr)
  targetexpr: z.string().optional(), // Expression to evaluate for target
  type: z.string().optional(), // Event I/O Processor type (e.g., 'http', 'scxml')
  typeexpr: z.string().optional(), // Expression to evaluate for processor type
  id: z.string().optional(), // Send ID for tracking
  idlocation: z.string().optional(), // Location to store generated send ID
  delay: z.string().optional(), // Delay before sending (e.g., '5s', '1000ms')
  delayexpr: z.string().optional(), // Expression to evaluate for delay
  namelist: z.string().optional(), // Space-separated list of data model variables to include
}).refine(
  (data) => {
    // Must have either event OR eventexpr, but not both
    const hasEvent = data.event && data.event.length > 0;
    const hasEventExpr = data.eventexpr && data.eventexpr.length > 0;
    return hasEvent !== hasEventExpr; // XOR - exactly one must be true
  },
  { message: "Must specify either 'event' attribute or 'eventexpr' attribute, but not both" }
).refine(
  (data) => {
    // Cannot have both target and targetexpr
    const hasTarget = data.target && data.target.length > 0;
    const hasTargetExpr = data.targetexpr && data.targetexpr.length > 0;
    return !(hasTarget && hasTargetExpr);
  },
  { message: "Cannot specify both 'target' and 'targetexpr' attributes" }
).refine(
  (data) => {
    // Cannot have both type and typeexpr
    const hasType = data.type && data.type.length > 0;
    const hasTypeExpr = data.typeexpr && data.typeexpr.length > 0;
    return !(hasType && hasTypeExpr);
  },
  { message: "Cannot specify both 'type' and 'typeexpr' attributes" }
).refine(
  (data) => {
    // Cannot have both delay and delayexpr
    const hasDelay = data.delay && data.delay.length > 0;
    const hasDelayExpr = data.delayexpr && data.delayexpr.length > 0;
    return !(hasDelay && hasDelayExpr);
  },
  { message: "Cannot specify both 'delay' and 'delayexpr' attributes" }
).refine(
  (data) => {
    // Cannot have both id and idlocation
    const hasId = data.id && data.id.length > 0;
    const hasIdLocation = data.idlocation && data.idlocation.length > 0;
    return !(hasId && hasIdLocation);
  },
  { message: "Cannot specify both 'id' and 'idlocation' attributes" }
);

export type SendNodeType = {
  send: z.infer<typeof SendNodeAttr>;
};

/**
 * Class implementation of the SCXML <send> node.
 * 
 * The <send> element is used to send events to external targets using
 * Event I/O Processors. It supports various communication protocols
 * through pluggable processors.
 * 
 * @see https://www.w3.org/TR/scxml/#send
 */
export class SendNode extends BaseExecutableNode implements z.infer<typeof SendNodeAttr> {
  readonly event: string | undefined;
  readonly eventexpr: string | undefined;
  readonly target: string | undefined;
  readonly targetexpr: string | undefined;
  readonly type: string | undefined;
  readonly typeexpr: string | undefined;
  readonly id: string | undefined;
  readonly idlocation: string | undefined;
  readonly delay: string | undefined;
  readonly delayexpr: string | undefined;
  readonly namelist: string | undefined;

  allowChildren = true;

  static label = 'send';
  static schema = SendNodeAttr;

  // Event I/O Processor Registry for handling external communication
  private processorRegistry: EventIOProcessorRegistry;

  constructor({ send }: SendNodeType, processorRegistry?: EventIOProcessorRegistry) {
    super(send);
    
    this.event = send.event;
    this.eventexpr = send.eventexpr;
    this.target = send.target;
    this.targetexpr = send.targetexpr;
    this.type = send.type;
    this.typeexpr = send.typeexpr;
    this.id = send.id;
    this.idlocation = send.idlocation;
    this.delay = send.delay;
    this.delayexpr = send.delayexpr;
    this.namelist = send.namelist;

    // Use provided registry or default
    this.processorRegistry = processorRegistry || defaultProcessorRegistry;
  }

  /**
   * Execute the send node to send an event to an external target.
   * 
   * This method evaluates all expressions, collects parameters,
   * and uses the appropriate Event I/O Processor to send the event.
   */
  async run(state: InternalState): Promise<InternalState> {
    try {
      // Evaluate event name
      const eventName = await this.evaluateEventName(state);
      
      // Evaluate target
      const target = await this.evaluateTarget(state);
      
      // Evaluate processor type
      const processorType = await this.evaluateProcessorType(state);
      
      // Evaluate delay
      const delay = await this.evaluateDelay(state);
      
      // Generate or evaluate send ID
      const sendId = await this.evaluateSendId(state);
      
      // Collect parameters from child <param> elements
      const params = await this.collectParameters(state);
      
      // Collect namelist variables
      const namelistData = await this.collectNamelistData(state);

      // Create SCXML event
      const scxmlEvent: SCXMLEvent = {
        name: eventName,
        type: 'external',
        sendid: sendId,
        origin: '', // Will be set by processor if needed
        origintype: processorType || '',
        invokeid: '', // Will be set if this is part of an invoke
        data: {
          ...namelistData,
          ...params
        }
      };

      // Handle delay if specified
      if (delay > 0) {
        // For now, we'll add the event to pending events with a delay
        // In a full implementation, this would use a timer system
        // Note: Delayed sends don't update the current state immediately
        setTimeout(async () => {
          await this.sendEvent(scxmlEvent, target, processorType, params, state);
        }, delay);
      } else {
        // Send immediately and process any generated events
        state = await this.sendEvent(scxmlEvent, target, processorType, params, state);
      }

      // Store send ID in idlocation if specified
      if (this.idlocation && sendId) {
        _.set(state.data, this.idlocation, sendId);
      }

      return state;
    } catch (error) {
      // Create error event and add to pending events
      const errorEvent = fromJsError(error);
      errorEvent.name = 'error.communication';
      errorEvent.data.source = '<send>';
      
      return addPendingEvent(state, errorEvent);
    }
  }

  /**
   * Evaluate the event name from either 'event' or 'eventexpr' attribute
   */
  private async evaluateEventName(state: InternalState): Promise<string> {
    if (this.event) {
      return this.event;
    } else if (this.eventexpr) {
      const result = evaluateExpression(this.eventexpr, state);
      return String(result);
    } else {
      throw new Error('No event name specified');
    }
  }

  /**
   * Evaluate the target from either 'target' or 'targetexpr' attribute
   */
  private async evaluateTarget(state: InternalState): Promise<string | undefined> {
    if (this.target) {
      return this.target;
    } else if (this.targetexpr) {
      const result = evaluateExpression(this.targetexpr, state);
      return String(result);
    }
    return undefined; // Target is optional
  }

  /**
   * Evaluate the processor type from either 'type' or 'typeexpr' attribute
   */
  private async evaluateProcessorType(state: InternalState): Promise<string | undefined> {
    if (this.type) {
      return this.type;
    } else if (this.typeexpr) {
      const result = evaluateExpression(this.typeexpr, state);
      return String(result);
    }
    return undefined; // Type is optional, will use default processor
  }

  /**
   * Evaluate the delay from either 'delay' or 'delayexpr' attribute
   */
  private async evaluateDelay(state: InternalState): Promise<number> {
    let delayValue: string | undefined;

    if (this.delay) {
      delayValue = this.delay;
    } else if (this.delayexpr) {
      const result = evaluateExpression(this.delayexpr, state);
      delayValue = String(result);
    }

    if (!delayValue) {
      return 0; // No delay
    }

    // Parse delay value (e.g., '5s', '1000ms', '2.5s')
    const match = delayValue.match(/^(\d+(?:\.\d+)?)(s|ms)?$/);
    if (!match) {
      throw new Error(`Invalid delay format: ${delayValue}`);
    }

    const value = parseFloat(match[1]!); // Safe because we checked match exists
    const unit = match[2] || 'ms'; // Default to milliseconds

    return unit === 's' ? value * 1000 : value;
  }

  /**
   * Generate or evaluate the send ID
   */
   
  private async evaluateSendId(_state: InternalState): Promise<string> {
    if (this.id) {
      return this.id;
    } else if (_state.data.sendId) {
      return _state.data.sendId as string;
    } else {
      // Generate a unique send ID
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 8);
      return `send_${timestamp}_${random}`;
    }
  }

  /**
   * Collect parameters from child <param> elements
   */
  private async collectParameters(state: InternalState): Promise<Record<string, unknown>> {
    const paramNodes = this.getChildrenOfType(ParamNode);
    return await collectParamValues(paramNodes, state);
  }

  /**
   * Collect data from namelist attribute
   */
  private async collectNamelistData(state: InternalState): Promise<Record<string, unknown>> {
    if (!this.namelist) {
      return {};
    }

    const namelistData: Record<string, unknown> = {};
    const names = this.namelist.split(/\s+/).filter(name => name.length > 0);

    for (const name of names) {
      try {
        // Evaluate each name as an expression to get its value from the data model
        const value = evaluateExpression(name, state);
        namelistData[name] = value;
      } catch (error) {
        // If evaluation fails, skip this variable
        console.warn(`Failed to evaluate namelist variable '${name}':`, error);
      }
    }

    return namelistData;
  }

  /**
   * Send the event using the appropriate Event I/O Processor
   */
  private async sendEvent(
    event: SCXMLEvent,
    target: string | undefined,
    processorType: string | undefined,
    config: Record<string, unknown>,
    state: InternalState
  ): Promise<InternalState> {
    if (!target) {
      throw new Error('No target specified for send operation');
    }

    const result = await this.processorRegistry.send(event, target, processorType, config);

    // Process any events generated by the processor
    let updatedState = { ...state };
    if (result.events) {
      for (const generatedEvent of result.events) {
        updatedState = addPendingEvent(updatedState, generatedEvent);
      }
    }

    // Only throw if there are no events to process (old behavior for non-event processors)
    if (!result.success && !result.events) {
      throw result.error || new Error('Send operation failed');
    }

    return updatedState;
  }

  /**
   * Create a SendNode instance from JSON data.
   */
  static createFromJSON(jsonInput: Record<string, unknown>): CreateFromJsonResponse<SendNode> {
    const { success, data, error } = this.schema.safeParse(
      this.getAttributes(this.label, jsonInput)
    );

    if (!success) {
      return { success: false, error, node: undefined };
    }

    return {
      success: true,
      node: new SendNode({ send: data }),
      error: undefined,
    };
  }
}
