import { Queue, QueueMode } from './event-queue';
import { SCXMLEvent } from './internalState';

describe('Queue', () => {
  describe('FIFO Mode (Default)', () => {
    let queue: Queue<string>;

    beforeEach(() => {
      queue = new Queue<string>();
    });

    describe('constructor', () => {
      it('should create an empty queue with FIFO mode by default', () => {
        expect(queue.isEmpty()).toBe(true);
        expect(queue.size).toBe(0);
      });

      it('should create an empty queue with explicit FIFO mode', () => {
        const fifoQueue = new Queue<string>(QueueMode.FirstInFirstOut);
        expect(fifoQueue.isEmpty()).toBe(true);
        expect(fifoQueue.size).toBe(0);
      });
    });

    describe('enqueue', () => {
      it('should add a single item to the queue', () => {
        queue.enqueue('item1');
        expect(queue.isEmpty()).toBe(false);
        expect(queue.size).toBe(1);
      });

      it('should add multiple items to the queue', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');
        expect(queue.size).toBe(3);
      });
    });

    describe('dequeue', () => {
      it('should return undefined when queue is empty', () => {
        expect(queue.dequeue()).toBeUndefined();
      });

      it('should return the first item added (FIFO behavior)', () => {
        queue.enqueue('first');
        queue.enqueue('second');
        queue.enqueue('third');

        expect(queue.dequeue()).toBe('first');
        expect(queue.size).toBe(2);
      });

      it('should return items in FIFO order', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');

        expect(queue.dequeue()).toBe('item1');
        expect(queue.dequeue()).toBe('item2');
        expect(queue.dequeue()).toBe('item3');
        expect(queue.dequeue()).toBeUndefined();
      });

      it('should reduce queue size when items are dequeued', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        expect(queue.size).toBe(2);

        queue.dequeue();
        expect(queue.size).toBe(1);

        queue.dequeue();
        expect(queue.size).toBe(0);
        expect(queue.isEmpty()).toBe(true);
      });
    });

    describe('peek', () => {
      it('should return undefined when queue is empty', () => {
        expect(queue.peek()).toBeUndefined();
      });

      it('should return the next item without removing it', () => {
        queue.enqueue('first');
        queue.enqueue('second');

        expect(queue.peek()).toBe('first');
        expect(queue.size).toBe(2); // Size should not change
        expect(queue.peek()).toBe('first'); // Should still be the same item
      });

      it('should return the first item in FIFO mode', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');

        expect(queue.peek()).toBe('item1');
      });
    });

    describe('clear', () => {
      it('should remove all items from the queue', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');
        expect(queue.size).toBe(3);

        queue.clear();
        expect(queue.isEmpty()).toBe(true);
        expect(queue.size).toBe(0);
        expect(queue.peek()).toBeUndefined();
        expect(queue.dequeue()).toBeUndefined();
      });

      it('should work on an already empty queue', () => {
        queue.clear();
        expect(queue.isEmpty()).toBe(true);
        expect(queue.size).toBe(0);
      });
    });

    describe('isEmpty', () => {
      it('should return true for a new queue', () => {
        expect(queue.isEmpty()).toBe(true);
      });

      it('should return false when queue has items', () => {
        queue.enqueue('item');
        expect(queue.isEmpty()).toBe(false);
      });

      it('should return true after all items are dequeued', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.dequeue();
        queue.dequeue();
        expect(queue.isEmpty()).toBe(true);
      });
    });

    describe('size', () => {
      it('should return 0 for empty queue', () => {
        expect(queue.size).toBe(0);
      });

      it('should return correct size as items are added', () => {
        expect(queue.size).toBe(0);
        queue.enqueue('item1');
        expect(queue.size).toBe(1);
        queue.enqueue('item2');
        expect(queue.size).toBe(2);
        queue.enqueue('item3');
        expect(queue.size).toBe(3);
      });

      it('should return correct size as items are removed', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');
        expect(queue.size).toBe(3);

        queue.dequeue();
        expect(queue.size).toBe(2);
        queue.dequeue();
        expect(queue.size).toBe(1);
        queue.dequeue();
        expect(queue.size).toBe(0);
      });
    });
  });

  describe('LIFO Mode', () => {
    let queue: Queue<string>;

    beforeEach(() => {
      queue = new Queue<string>(QueueMode.LastInFirstOut);
    });

    describe('constructor', () => {
      it('should create an empty queue with LIFO mode', () => {
        expect(queue.isEmpty()).toBe(true);
        expect(queue.size).toBe(0);
      });
    });

    describe('enqueue', () => {
      it('should add items to the queue', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        expect(queue.size).toBe(2);
      });
    });

    describe('dequeue', () => {
      it('should return undefined when queue is empty', () => {
        expect(queue.dequeue()).toBeUndefined();
      });

      it('should return the last item added (LIFO behavior)', () => {
        queue.enqueue('first');
        queue.enqueue('second');
        queue.enqueue('third');

        expect(queue.dequeue()).toBe('third');
        expect(queue.size).toBe(2);
      });

      it('should return items in LIFO order', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');

        expect(queue.dequeue()).toBe('item3');
        expect(queue.dequeue()).toBe('item2');
        expect(queue.dequeue()).toBe('item1');
        expect(queue.dequeue()).toBeUndefined();
      });
    });

    describe('peek', () => {
      it('should return undefined when queue is empty', () => {
        expect(queue.peek()).toBeUndefined();
      });

      it('should return the last item without removing it', () => {
        queue.enqueue('first');
        queue.enqueue('second');

        expect(queue.peek()).toBe('second');
        expect(queue.size).toBe(2); // Size should not change
        expect(queue.peek()).toBe('second'); // Should still be the same item
      });

      it('should return the last item in LIFO mode', () => {
        queue.enqueue('item1');
        queue.enqueue('item2');
        queue.enqueue('item3');

        expect(queue.peek()).toBe('item3');
      });
    });
  });

  describe('SCXMLEvent Integration', () => {
    let eventQueue: Queue<SCXMLEvent>;

    beforeEach(() => {
      eventQueue = new Queue<SCXMLEvent>();
    });

    const createEvent = (name: string, type: 'internal' | 'external' | 'platform' = 'internal'): SCXMLEvent => ({
      name,
      type,
      sendid: '',
      origin: '',
      origintype: '',
      invokeid: '',
      data: {}
    });

    it('should handle SCXMLEvent objects correctly', () => {
      const event1 = createEvent('event1');
      const event2 = createEvent('event2', 'external');

      eventQueue.enqueue(event1);
      eventQueue.enqueue(event2);

      expect(eventQueue.size).toBe(2);

      const dequeuedEvent1 = eventQueue.dequeue();
      expect(dequeuedEvent1).toEqual(event1);
      expect(dequeuedEvent1?.name).toBe('event1');
      expect(dequeuedEvent1?.type).toBe('internal');

      const dequeuedEvent2 = eventQueue.dequeue();
      expect(dequeuedEvent2).toEqual(event2);
      expect(dequeuedEvent2?.name).toBe('event2');
      expect(dequeuedEvent2?.type).toBe('external');
    });

    it('should handle complex event data', () => {
      const complexEvent: SCXMLEvent = {
        name: 'user.action',
        type: 'external',
        sendid: 'send123',
        origin: 'ui-component',
        origintype: 'http://example.com',
        invokeid: 'invoke456',
        data: {
          userId: 123,
          action: 'click',
          metadata: {
            timestamp: Date.now(),
            coordinates: { x: 100, y: 200 }
          }
        }
      };

      eventQueue.enqueue(complexEvent);
      const retrieved = eventQueue.dequeue();

      expect(retrieved).toEqual(complexEvent);
      expect(retrieved?.data.userId).toBe(123);
      const metadata = retrieved?.data.metadata as { coordinates: { x: number; y: number } };
      expect(metadata?.coordinates?.x).toBe(100);
    });

    it('should maintain event order for different event types', () => {
      const internalEvent = createEvent('internal.event', 'internal');
      const externalEvent = createEvent('external.event', 'external');
      const platformEvent = createEvent('platform.event', 'platform');

      eventQueue.enqueue(internalEvent);
      eventQueue.enqueue(externalEvent);
      eventQueue.enqueue(platformEvent);

      expect(eventQueue.dequeue()?.name).toBe('internal.event');
      expect(eventQueue.dequeue()?.name).toBe('external.event');
      expect(eventQueue.dequeue()?.name).toBe('platform.event');
    });
  });

  describe('Edge Cases', () => {
    let queue: Queue<number>;

    beforeEach(() => {
      queue = new Queue<number>();
    });

    it('should handle rapid enqueue/dequeue operations', () => {
      // Simulate rapid operations
      for (let i = 0; i < 1000; i++) {
        queue.enqueue(i);
      }
      expect(queue.size).toBe(1000);

      for (let i = 0; i < 1000; i++) {
        expect(queue.dequeue()).toBe(i);
      }
      expect(queue.isEmpty()).toBe(true);
    });

    it('should handle mixed operations correctly', () => {
      queue.enqueue(1);
      queue.enqueue(2);
      expect(queue.dequeue()).toBe(1);

      queue.enqueue(3);
      expect(queue.peek()).toBe(2);
      expect(queue.dequeue()).toBe(2);
      expect(queue.dequeue()).toBe(3);
      expect(queue.isEmpty()).toBe(true);
    });

    it('should handle null and undefined values', () => {
      const nullQueue = new Queue<null>();
      const undefinedQueue = new Queue<undefined>();

      nullQueue.enqueue(null);
      expect(nullQueue.dequeue()).toBe(null);

      undefinedQueue.enqueue(undefined);
      expect(undefinedQueue.dequeue()).toBe(undefined);
    });

    it('should handle objects and arrays', () => {
      const objectQueue = new Queue<{ id: number; name: string }>();
      const arrayQueue = new Queue<number[]>();

      const obj = { id: 1, name: 'test' };
      const arr = [1, 2, 3];

      objectQueue.enqueue(obj);
      arrayQueue.enqueue(arr);

      expect(objectQueue.dequeue()).toEqual(obj);
      expect(arrayQueue.dequeue()).toEqual(arr);
    });
  });
});