/**
 * Type-safe event emitter with throttling support.
 * Replaces the legacy EventAggregator.
 */

type Handler<T = unknown> = (data: T) => void;

export class EventBus {
  private handlers = new Map<string, Set<Handler>>();

  on<T>(event: string, handler: Handler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as Handler);
    return () => this.off(event, handler);
  }

  off<T>(event: string, handler: Handler<T>): void {
    this.handlers.get(event)?.delete(handler as Handler);
  }

  emit<T>(event: string, data?: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) {
      try {
        h(data);
      } catch (e) {
        console.error(`Event handler error [${event}]:`, e);
      }
    }
  }

  once<T>(event: string, handler: Handler<T>): () => void {
    const wrapper: Handler<T> = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    return this.on(event, wrapper);
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Throttled event aggregator — fires handler at most once per `interval` ms.
 */
export class ThrottledEmitter<T = void> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending = false;
  private lastData: T | undefined;

  constructor(
    private handler: (data: T | undefined) => void,
    private interval: number = 1000,
  ) {}

  update(data?: T): void {
    this.lastData = data;
    if (this.timer !== null) {
      this.pending = true;
      return;
    }
    this.fire();
  }

  private fire(): void {
    this.pending = false;
    this.handler(this.lastData);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.pending) this.fire();
    }, this.interval);
  }

  cancel(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.pending = false;
  }
}

export const globalEvents = new EventBus();
