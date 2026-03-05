/**
 * Shared mutable state for the control subsystem.
 *
 * All control sub-modules import state from here to avoid circular
 * dependency issues. State is mutated via exported setter functions.
 */

import { IDENTITY_NUMBER_ZERO } from '../../core/constants';

// ---------------------------------------------------------------------------
// Mouse state
// ---------------------------------------------------------------------------
export let mouse_x: number = 0;
export let mouse_y: number = 0;
export let prev_mouse_x: number = 0;
export let prev_mouse_y: number = 0;
export let keyboard_input: boolean = true;
export let unitpanel_active: boolean = false;
export let allow_right_click: boolean = false;
export let mapview_mouse_movement: boolean = false;

export function setMouseX(v: number) { mouse_x = v; }
export function setMouseY(v: number) { mouse_y = v; }
export function setPrevMouseX(v: number) { prev_mouse_x = v; }
export function setPrevMouseY(v: number) { prev_mouse_y = v; }
export function setKeyboardInput(v: boolean) { keyboard_input = v; }
export function setUnitpanelActive(v: boolean) { unitpanel_active = v; }
export function setAllowRightClick(v: boolean) { allow_right_click = v; }
export function setMapviewMouseMovement(v: boolean) { mapview_mouse_movement = v; }

// ---------------------------------------------------------------------------
// Roads / bases (shared with rendering)
// ---------------------------------------------------------------------------
export let roads: any[] = [];
export let bases: any[] = [];

export function setRoads(v: any[]) { roads = v; }
export function setBases(v: any[]) { bases = v; }

// ---------------------------------------------------------------------------
// Unit focus state
// ---------------------------------------------------------------------------
export let current_focus: any[] = [];
export let urgent_focus_queue: any[] = [];
export let waiting_units_list: any[] = [];

export function setCurrentFocus(v: any[]) { current_focus = v; }
export function setUrgentFocusQueue(v: any[]) { urgent_focus_queue = v; }
export function setWaitingUnitsList(v: any[]) { waiting_units_list = v; }

// ---------------------------------------------------------------------------
// Goto state
// ---------------------------------------------------------------------------
export let goto_active: boolean = false;
export let paradrop_active: boolean = false;
export let airlift_active: boolean = false;
export let action_tgt_sel_active: boolean = false;
export let goto_last_order: number = -1;
export let goto_last_action: number = -1;
export let goto_request_map: { [key: string]: any } = {};
export let goto_turns_request_map: { [key: string]: any } = {};
export let current_goto_turns: number = 0;

export function setGotoActive(v: boolean) { goto_active = v; }
export function setParadropActive(v: boolean) { paradrop_active = v; }
export function setAirliftActive(v: boolean) { airlift_active = v; }
export function setActionTgtSelActive(v: boolean) { action_tgt_sel_active = v; }
export function setGotoLastOrder(v: number) { goto_last_order = v; }
export function setGotoLastAction(v: number) { goto_last_action = v; }
export function setGotoRequestMap(v: { [key: string]: any }) { goto_request_map = v; }
export function setGotoTurnsRequestMap(v: { [key: string]: any }) { goto_turns_request_map = v; }
export function setCurrentGotoTurns(v: number) { current_goto_turns = v; }

// ---------------------------------------------------------------------------
// Selection constants
// ---------------------------------------------------------------------------
export const SELECT_POPUP: number = 0;
export const SELECT_SEA: number = 1;
export const SELECT_LAND: number = 2;
export const SELECT_APPEND: number = 3;

// ---------------------------------------------------------------------------
// UI / misc state
// ---------------------------------------------------------------------------
export let intro_click_description: boolean = true;
export let resize_enabled: boolean = true;
export let show_citybar: boolean = true;
export let context_menu_active: boolean = true;
export let has_movesleft_warning_been_shown: boolean = false;
export let game_unit_panel_state: any = null;
export let end_turn_info_message_shown: boolean = false;

export function setIntroClickDescription(v: boolean) { intro_click_description = v; }
export function setResizeEnabled(v: boolean) { resize_enabled = v; }
export function setShowCitybar(v: boolean) { show_citybar = v; }
export function setContextMenuActive(v: boolean) { context_menu_active = v; }
export function setHasMovesleftWarningBeenShown(v: boolean) { has_movesleft_warning_been_shown = v; }
export function setGameUnitPanelState(v: any) { game_unit_panel_state = v; }
export function setEndTurnInfoMessageShown(v: boolean) { end_turn_info_message_shown = v; }

// ---------------------------------------------------------------------------
// Chat state
// ---------------------------------------------------------------------------
export let chat_send_to: number = -1;
export const CHAT_ICON_EVERYBODY: string = String.fromCharCode(62075);
export const CHAT_ICON_ALLIES: string = String.fromCharCode(61746);

export function setChatSendTo(v: number) { chat_send_to = v; }

// ---------------------------------------------------------------------------
// Action selection state
// ---------------------------------------------------------------------------
export let action_selection_in_progress_for: number = IDENTITY_NUMBER_ZERO;
export let is_more_user_input_needed: boolean = false;

export function setActionSelectionInProgressFor(v: number) { action_selection_in_progress_for = v; }
export function setIsMoreUserInputNeeded(v: boolean) { is_more_user_input_needed = v; }
export function set_is_more_user_input_needed(val: boolean): void { is_more_user_input_needed = val; }

// ---------------------------------------------------------------------------
// Mouse touch state (used by mouse.ts)
// ---------------------------------------------------------------------------
export let mouse_touch_started_on_unit: boolean = false;
export function setMouseTouchStartedOnUnit(v: boolean) { mouse_touch_started_on_unit = v; }
