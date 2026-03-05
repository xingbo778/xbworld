/**
 * Action selection — asking the server about possible actions for units.
 *
 * Extracted from core/control.ts
 */

import { ACT_DEC_ACTIVE, ACT_DEC_PASSIVE, ACT_DEC_NOTHING } from '../../data/fcTypes';
import { EXTRA_NONE } from '../../data/extra';
import { IDENTITY_NUMBER_ZERO } from '../../core/constants';
import { UnitSSDataType } from '../../data/unit';
import { indexToTile as index_to_tile } from '../../data/map';
import { send_request } from '../../net/connection';
import { packet_unit_get_actions, packet_unit_sscs_set } from '../../net/packetConstants';
import { game_find_unit_by_number } from '../../data/game';
import { canClientIssueOrders as can_client_issue_orders } from '../../client/clientState';
import { popup_actor_arrival } from '../../ui/options';
import * as S from './controlState';
// Circular import — OK because only used inside functions (not at init time)
import { unit_is_in_focus, unit_focus_urgent } from './unitFocus';

const FC_ACT_DEC_ACTIVE = ACT_DEC_ACTIVE;
const FC_ACT_DEC_PASSIVE = ACT_DEC_PASSIVE;
const FC_ACT_DEC_NOTHING = ACT_DEC_NOTHING;
const FC_IDENTITY_NUMBER_ZERO = IDENTITY_NUMBER_ZERO;
const FC_EXTRA_NONE = EXTRA_NONE;
const USSDT_UNQUEUE = UnitSSDataType.UNQUEUE;
const REQEST_PLAYER_INITIATED = 0;

type packet_type_t = Record<string, any>;

// observing is exported from pregame.ts; using declare to avoid circular dep
declare const observing: boolean;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function should_ask_server_for_actions(punit: any): boolean {
  return (punit['action_decision_want'] === FC_ACT_DEC_ACTIVE
    || (punit['action_decision_want'] === FC_ACT_DEC_PASSIVE
      && popup_actor_arrival));
}

export function can_ask_server_for_actions(): boolean {
  return S.action_selection_in_progress_for === FC_IDENTITY_NUMBER_ZERO;
}

export function ask_server_for_actions(punit: any): boolean {
  if (observing || punit == null) {
    return false;
  }

  if (S.action_selection_in_progress_for != FC_IDENTITY_NUMBER_ZERO
    && S.action_selection_in_progress_for != punit.id) {
    console.log("Unit %d started action selection before unit %d was done",
      S.action_selection_in_progress_for, punit.id);
  }
  S.setActionSelectionInProgressFor(punit.id);

  const ptile = index_to_tile(punit['action_decision_tile']);

  if (ptile != null) {
    const packet: packet_type_t = {
      "pid": packet_unit_get_actions,
      "actor_unit_id": punit['id'],
      "target_unit_id": FC_IDENTITY_NUMBER_ZERO,
      "target_tile_id": punit['action_decision_tile'],
      "target_extra_id": FC_EXTRA_NONE,
      "request_kind": REQEST_PLAYER_INITIATED,
    };
    send_request(JSON.stringify(packet));
  }
  return true;
}

export function action_selection_no_longer_in_progress(old_actor_id: number): void {
  if (old_actor_id != S.action_selection_in_progress_for
    && old_actor_id != FC_IDENTITY_NUMBER_ZERO
    && S.action_selection_in_progress_for != FC_IDENTITY_NUMBER_ZERO) {
    console.log("Decision taken for %d but selection is for %d.",
      old_actor_id, S.action_selection_in_progress_for);
  }

  S.setActionSelectionInProgressFor(FC_IDENTITY_NUMBER_ZERO);
  S.setIsMoreUserInputNeeded(false);
}

export function action_decision_clear_want(old_actor_id: number): void {
  const old = game_find_unit_by_number(old_actor_id);

  if (old != null && old['action_decision_want'] !== FC_ACT_DEC_NOTHING) {
    const unqueue: packet_type_t = {
      "pid": packet_unit_sscs_set,
      "unit_id": old_actor_id,
      "type": USSDT_UNQUEUE,
      "value": FC_IDENTITY_NUMBER_ZERO
    };
    send_request(JSON.stringify(unqueue));
  }
}

export function action_selection_next_in_focus(old_actor_id: number): void {
  for (let i = 0; i < S.current_focus.length; i++) {
    const funit = S.current_focus[i];
    if (old_actor_id != funit['id']
      && should_ask_server_for_actions(funit)) {
      ask_server_for_actions(funit);
      return;
    }
  }
}

export function action_decision_request(actor_unit: any): void {
  if (actor_unit == null) {
    console.log("action_decision_request(): No actor unit");
    return;
  }

  if (!unit_is_in_focus(actor_unit)) {
    unit_focus_urgent(actor_unit);
  } else if (can_client_issue_orders()
    && can_ask_server_for_actions()) {
    ask_server_for_actions(actor_unit);
  }
}
