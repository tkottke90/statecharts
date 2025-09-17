import { EventEmitter } from 'events';
import { SCXMLEvent } from './internalState';

/**
 * Configuration options for an Event I/O Processor
 */
export interface ProcessorConfig {
  [key: string]: unknown;
}

/**
 * Result of sending an event through a processor
 */
export interface SendResult {
  success: boolean;
  error?: Error;
  sendid?: string;
}

/**
 * Interface for Event I/O Processors that handle external communication
 * 
 * Event I/O Processors are pluggable communication modules that abstract
 * different protocols and communication methods (HTTP, WebSocket, etc.)
 */
export interface EventIOProcessor {
  /**
   * The type identifier for this processor (e.g., 'http', 'websocket', 'scxml')
   * This corresponds to the 'type' attribute in <send> elements
   */
  readonly type: string;

  /**
   * Send an event to an external target
   * 
   * @param event - The SCXML event to send
   * @param target - The target URI or identifier
   * @param config - Processor-specific configuration parameters
   * @returns Promise resolving to send result
   */
  send(event: SCXMLEvent, target: string, config?: ProcessorConfig): Promise<SendResult>;

  /**
   * Initialize the processor with configuration
   * 
   * @param config - Processor-specific configuration
   * @returns Promise that resolves when initialization is complete
   */
  initialize?(config?: ProcessorConfig): Promise<void>;

  /**
   * Clean up resources when the processor is no longer needed
   * 
   * @returns Promise that resolves when cleanup is complete
   */
  cleanup?(): Promise<void>;

  /**
   * Check if the processor can handle a specific target
   * 
   * @param target - The target URI or identifier
   * @returns true if this processor can handle the target
   */
  canHandle?(target: string): boolean;
}

/**
 * Registry for managing Event I/O Processors
 * 
 * Provides a centralized way to register, retrieve, and manage
 * different types of Event I/O Processors
 */
export class EventIOProcessorRegistry extends EventEmitter {
  private processors = new Map<string, EventIOProcessor>();
  private defaultProcessor: EventIOProcessor | undefined;

  /**
   * Register an Event I/O Processor
   * 
   * @param processor - The processor to register
   * @throws Error if a processor with the same type is already registered
   */
  register(processor: EventIOProcessor): void {
    if (this.processors.has(processor.type)) {
      throw new Error(`Event I/O Processor with type '${processor.type}' is already registered`);
    }

    this.processors.set(processor.type, processor);
    this.emit('processorRegistered', processor.type, processor);
  }

  /**
   * Unregister an Event I/O Processor
   * 
   * @param type - The type of processor to unregister
   * @returns true if a processor was unregistered, false if none was found
   */
  unregister(type: string): boolean {
    const processor = this.processors.get(type);
    if (!processor) {
      return false;
    }

    this.processors.delete(type);
    this.emit('processorUnregistered', type, processor);
    
    // Clean up the processor if it supports cleanup
    if (processor.cleanup) {
      processor.cleanup().catch(error => {
        this.emit('error', new Error(`Failed to cleanup processor '${type}': ${error.message}`));
      });
    }

    return true;
  }

  /**
   * Get a registered Event I/O Processor by type
   * 
   * @param type - The type of processor to retrieve
   * @returns The processor if found, undefined otherwise
   */
  get(type: string): EventIOProcessor | undefined {
    return this.processors.get(type);
  }

  /**
   * Get all registered processor types
   * 
   * @returns Array of registered processor types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.processors.keys());
  }

  /**
   * Check if a processor type is registered
   * 
   * @param type - The type to check
   * @returns true if registered, false otherwise
   */
  has(type: string): boolean {
    return this.processors.has(type);
  }

  /**
   * Set the default processor to use when no type is specified
   * 
   * @param processor - The processor to use as default
   */
  setDefault(processor: EventIOProcessor): void {
    this.defaultProcessor = processor;
    this.emit('defaultProcessorSet', processor.type, processor);
  }

  /**
   * Get the default processor
   * 
   * @returns The default processor if set, undefined otherwise
   */
  getDefault(): EventIOProcessor | undefined {
    return this.defaultProcessor;
  }

  /**
   * Send an event using the appropriate processor
   * 
   * @param event - The SCXML event to send
   * @param target - The target URI or identifier
   * @param type - The processor type to use (optional, will try to auto-detect)
   * @param config - Processor-specific configuration
   * @returns Promise resolving to send result
   */
  async send(
    event: SCXMLEvent, 
    target: string, 
    type?: string, 
    config?: ProcessorConfig
  ): Promise<SendResult> {
    let processor: EventIOProcessor | undefined;

    if (type) {
      // Use specified processor type
      processor = this.get(type);
      if (!processor) {
        return {
          success: false,
          error: new Error(`No Event I/O Processor registered for type '${type}'`)
        };
      }
    } else {
      // Try to find a processor that can handle the target
      for (const p of this.processors.values()) {
        if (p.canHandle && p.canHandle(target)) {
          processor = p;
          break;
        }
      }

      // Fall back to default processor if no specific handler found
      if (!processor) {
        processor = this.defaultProcessor;
      }
    }

    if (!processor) {
      return {
        success: false,
        error: new Error(`No suitable Event I/O Processor found for target '${target}'`)
      };
    }

    try {
      const result = await processor.send(event, target, config);
      this.emit('eventSent', event, target, processor.type, result);
      return result;
    } catch (error) {
      const sendError = error instanceof Error ? error : new Error(String(error));
      const result: SendResult = {
        success: false,
        error: sendError
      };
      this.emit('sendError', event, target, processor.type, sendError);
      return result;
    }
  }

  /**
   * Clear all registered processors
   */
  clear(): void {
    const types = Array.from(this.processors.keys());
    
    // Clean up all processors
    for (const processor of this.processors.values()) {
      if (processor.cleanup) {
        processor.cleanup().catch(error => {
          this.emit('error', new Error(`Failed to cleanup processor '${processor.type}': ${error.message}`));
        });
      }
    }

    this.processors.clear();
    this.defaultProcessor = undefined;
    this.emit('registryCleared', types);
  }

  /**
   * Get the number of registered processors
   * 
   * @returns Number of registered processors
   */
  get size(): number {
    return this.processors.size;
  }
}

interface HttpProcessorConfig extends ProcessorConfig {
  method?: RequestInit['method'] | undefined;
  headers?: RequestInit['headers'] | undefined;
  timeout?: number | undefined;
}

/**
 * Basic HTTP Event I/O Processor implementation
 *
 * This processor handles HTTP requests for external communication
 */
export class HTTPProcessor implements EventIOProcessor {
  readonly type = 'http';

  async send(event: SCXMLEvent, target: string, config?: HttpProcessorConfig): Promise<SendResult> {
    try {
      const { 
        method = 'GET',
        headers = { 'Content-Type': 'application/json' },
        timeout = undefined,
      } = config || {};

      const abortCtrl = new AbortController();

      // Prepare request body
      const body = JSON.stringify({
        event: event.name,
        type: event.type,
        data: event.data,
        sendid: event.sendid,
        origin: event.origin,
        origintype: event.origintype,
        invokeid: event.invokeid
      });

      let timerId: NodeJS.Timeout | undefined;

      if (timeout) {
        timerId = setTimeout(() => abortCtrl.abort(), timeout);
      }

      try {
        // Make HTTP request
        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: abortCtrl.signal
        };

        if (method !== 'GET') {
          fetchOptions.body = body;
        }

        const response = await fetch(target, fetchOptions);

        if (!response.ok) {
          return {
            success: false,
            error: new Error(`HTTP ${response.status}: ${response.statusText}`)
          };
        }

        return {
          success: true,
          sendid: event.sendid
        };

      } catch (fetchError) {
        throw fetchError;
      } finally {
        clearTimeout(timerId)
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  canHandle(target: string): boolean {
    return target.startsWith('http://') || target.startsWith('https://');
  }
}

/**
 * Basic SCXML Event I/O Processor implementation
 *
 * This processor handles communication between SCXML state machine instances
 */
export class SCXMLProcessor implements EventIOProcessor {
  readonly type = 'scxml';
  private targetRegistry = new Map<string, EventEmitter>();

  async send(event: SCXMLEvent, target: string, /* config: ProcessorConfig */): Promise<SendResult> {
    try {
      // Parse SCXML target (e.g., "scxml:sessionId" or "#_internal")
      let targetId: string;

      if (target.startsWith('scxml:')) {
        targetId = target.substring(6);
      } else if (target === '#_internal') {
        targetId = '_internal';
      } else {
        return {
          success: false,
          error: new Error(`Invalid SCXML target format: ${target}`)
        };
      }

      const targetEmitter = this.targetRegistry.get(targetId);
      if (!targetEmitter) {
        return {
          success: false,
          error: new Error(`SCXML target '${targetId}' not found`)
        };
      }

      // Emit the event to the target
      targetEmitter.emit('scxmlEvent', event);

      return {
        success: true,
        sendid: event.sendid
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  }

  canHandle(target: string): boolean {
    return target.startsWith('scxml:') || target === '#_internal';
  }

  /**
   * Register a target for SCXML communication
   *
   * @param targetId - The target identifier
   * @param emitter - The event emitter to send events to
   */
  registerTarget(targetId: string, emitter: EventEmitter): void {
    this.targetRegistry.set(targetId, emitter);
  }

  /**
   * Unregister a target
   *
   * @param targetId - The target identifier to unregister
   */
  unregisterTarget(targetId: string): void {
    this.targetRegistry.delete(targetId);
  }
}

/**
 * Default Event I/O Processor Registry instance
 *
 * This is a singleton instance that can be used throughout the application
 * for managing Event I/O Processors. It comes pre-configured with basic
 * HTTP and SCXML processors.
 */
export const defaultProcessorRegistry = new EventIOProcessorRegistry();

// Register default processors
defaultProcessorRegistry.register(new HTTPProcessor());
defaultProcessorRegistry.register(new SCXMLProcessor());
defaultProcessorRegistry.setDefault(defaultProcessorRegistry.get('http')!);
