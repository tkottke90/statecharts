export enum QueueMode {
  FirstInFirstOut,
  LastInFirstOut,
}

export class Queue<EventType> {
  private queue: EventType[] = [];

  constructor(private mode: QueueMode = QueueMode.FirstInFirstOut) {}

  enqueue(event: EventType) {
    switch (this.mode) {
      case QueueMode.FirstInFirstOut:
        this.queue.push(event);
        break;
      case QueueMode.LastInFirstOut:
        this.queue.push(event);
        break;
    }
  }

  dequeue(): EventType | undefined {
    switch (this.mode) {
      case QueueMode.FirstInFirstOut:
        return this.queue.shift();
      case QueueMode.LastInFirstOut:
        return this.queue.pop();
    }
  }

  clear() {
    this.queue = [];
  }

  isEmpty() {
    return this.queue.length === 0;
  }

  get size() {
    return this.queue.length;
  }

  peek(): EventType | undefined {
    switch (this.mode) {
      case QueueMode.FirstInFirstOut:
        return this.queue.at(0);
      case QueueMode.LastInFirstOut:
        return this.queue.at(-1);
    }
  }

  toArray() {
    return [...this.queue];
  }
}
