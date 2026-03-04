/**
 * XBWorld — Actions data module (migrated from actions.js)
 *
 * Pure query/calculation functions for game actions.
 * All functions read from `window.actions` (set by Legacy packhand.js).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActionProb {
  min: number;
  max: number;
}

interface Action {
  id: number;
  result: number;
  ui_name: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Return the action with the given id.
 * Returns null if no action with the given id exists.
 */
export function actionByNumber(actId: number): Action | null {
  const actions = (window as any).actions as Record<number, Action>;
  if (actions[actId] == undefined) {
    console.log('Asked for non existing action numbered %d', actId);
    return null;
  }
  return actions[actId];
}

/**
 * Returns true iff performing the specified action has the specified result.
 */
export function actionHasResult(paction: Action | null, result: number): boolean | null {
  if (paction == null || paction['result'] == null) {
    console.log('action_has_result(): bad action');
    console.log(paction);
    return null;
  }
  return paction['result'] == result;
}

/**
 * Returns true iff the given action probability belongs to an action that
 * may be possible.
 *
 * NOTE: action_prob_not_impl is defined in action_dialog.js (Legacy).
 */
export function actionProbPossible(aprob: ActionProb): boolean {
  const notImpl = (window as any).action_prob_not_impl as
    ((p: ActionProb) => boolean) | undefined;
  return 0 < aprob['max'] || (notImpl != null && notImpl(aprob));
}

// ---------------------------------------------------------------------------
// Expose to legacy
// ---------------------------------------------------------------------------

