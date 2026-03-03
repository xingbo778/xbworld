import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  clientState,
  canClientChangeView,
  canClientControl,
  canClientIssueOrders,
  clientIsObserver,
} from '@/client/clientState';
import { ClientState } from '@/core/constants';

/* eslint-disable @typescript-eslint/no-explicit-any */
const win = window as any;

describe('clientState', () => {
  afterEach(() => {
    delete win.civclient_state;
    delete win.client;
    delete win.observing;
  });

  it('should return INITIAL when civclient_state is not set', () => {
    expect(clientState()).toBe(ClientState.INITIAL);
  });

  it('should return the current state from window.civclient_state', () => {
    win.civclient_state = ClientState.RUNNING;
    expect(clientState()).toBe(ClientState.RUNNING);
  });
});

describe('clientIsObserver', () => {
  afterEach(() => {
    delete win.client;
    delete win.observing;
  });

  /**
   * REGRESSION: Pitfall #9 — Optional chaining on uninitialized client.
   *
   * When client or client.conn is not initialized, the TS version with
   * `c?.conn?.playing == null` would return true (undefined == null → true),
   * incorrectly marking the player as an observer. This broke
   * advance_unit_focus() which skips observers, preventing the map from
   * centering on the player's units at game start.
   *
   * Legacy behavior: throws an error when client.conn is undefined,
   * effectively returning a non-true value to the caller.
   *
   * Fix: Return false when client or conn is not initialized.
   */
  it('should return false when client is undefined (not observer)', () => {
    win.client = undefined;
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('should return false when client is null', () => {
    win.client = null;
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('should return false when client.conn is undefined', () => {
    win.client = {};
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('should return false when client.conn is null', () => {
    win.client = { conn: null };
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('should return false when playing is set and not observer', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = false;
    expect(clientIsObserver()).toBe(false);
  });

  it('should return true when playing is null (observer)', () => {
    win.client = { conn: { playing: null, observer: false } };
    win.observing = false;
    expect(clientIsObserver()).toBe(true);
  });

  it('should return true when conn.observer is true', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: true } };
    win.observing = false;
    expect(clientIsObserver()).toBe(true);
  });

  it('should return true when window.observing is true', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = true;
    expect(clientIsObserver()).toBe(true);
  });
});

describe('canClientControl', () => {
  afterEach(() => {
    delete win.client;
    delete win.observing;
  });

  it('should return true when not observer', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = false;
    expect(canClientControl()).toBe(true);
  });

  it('should return false when observer', () => {
    win.client = { conn: { playing: null, observer: false } };
    win.observing = false;
    expect(canClientControl()).toBe(false);
  });

  /**
   * REGRESSION: When client is uninitialized, canClientControl should
   * return true (not observer), not false.
   */
  it('should return true when client is uninitialized', () => {
    win.client = undefined;
    win.observing = false;
    expect(canClientControl()).toBe(true);
  });
});

describe('canClientIssueOrders', () => {
  afterEach(() => {
    delete win.client;
    delete win.observing;
    delete win.civclient_state;
  });

  it('should return true when can control and running', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = false;
    win.civclient_state = ClientState.RUNNING;
    expect(canClientIssueOrders()).toBe(true);
  });

  it('should return false when observer', () => {
    win.client = { conn: { playing: null, observer: false } };
    win.observing = false;
    win.civclient_state = ClientState.RUNNING;
    expect(canClientIssueOrders()).toBe(false);
  });

  it('should return false when not running', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = false;
    win.civclient_state = ClientState.PREPARING;
    expect(canClientIssueOrders()).toBe(false);
  });
});

describe('canClientChangeView', () => {
  afterEach(() => {
    delete win.client;
    delete win.observing;
    delete win.civclient_state;
  });

  it('should return true when playing and running', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = false;
    win.civclient_state = ClientState.RUNNING;
    expect(canClientChangeView()).toBe(true);
  });

  it('should return false when not running', () => {
    win.client = { conn: { playing: { playerno: 0 }, observer: false } };
    win.observing = false;
    win.civclient_state = ClientState.INITIAL;
    expect(canClientChangeView()).toBe(false);
  });
});
