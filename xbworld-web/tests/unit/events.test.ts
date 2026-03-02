import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventBus, ThrottledEmitter } from '@/core/events';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('should emit and receive events', () => {
    const handler = vi.fn();
    bus.on('test', handler);
    bus.emit('test', 42);
    expect(handler).toHaveBeenCalledWith(42);
  });

  it('should support multiple handlers', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test', 'data');
    expect(h1).toHaveBeenCalledWith('data');
    expect(h2).toHaveBeenCalledWith('data');
  });

  it('should unsubscribe via returned function', () => {
    const handler = vi.fn();
    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should unsubscribe via off()', () => {
    const handler = vi.fn();
    bus.on('test', handler);
    bus.off('test', handler);
    bus.emit('test');
    expect(handler).not.toHaveBeenCalled();
  });

  it('should support once()', () => {
    const handler = vi.fn();
    bus.once('test', handler);
    bus.emit('test', 1);
    bus.emit('test', 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('should not throw on emit with no handlers', () => {
    expect(() => bus.emit('nonexistent')).not.toThrow();
  });

  it('should catch handler errors', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    bus.on('test', () => { throw new Error('oops'); });
    expect(() => bus.emit('test')).not.toThrow();
    spy.mockRestore();
  });

  it('should clear all handlers', () => {
    const handler = vi.fn();
    bus.on('test', handler);
    bus.clear();
    bus.emit('test');
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('ThrottledEmitter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should fire immediately on first update', () => {
    const handler = vi.fn();
    const emitter = new ThrottledEmitter(handler, 1000);
    emitter.update('data');
    expect(handler).toHaveBeenCalledWith('data');
  });

  it('should throttle subsequent updates', () => {
    const handler = vi.fn();
    const emitter = new ThrottledEmitter(handler, 1000);
    emitter.update('first');
    emitter.update('second');
    emitter.update('third');
    expect(handler).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenLastCalledWith('third');
  });

  it('should cancel pending updates', () => {
    const handler = vi.fn();
    const emitter = new ThrottledEmitter(handler, 1000);
    emitter.update('first');
    emitter.update('second');
    emitter.cancel();
    vi.advanceTimersByTime(2000);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
