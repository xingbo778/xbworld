/**********************************************************************
    Freeciv-web - the web version of Freeciv. https://www.freeciv.org/
    Copyright (C) 2022 FCIV.NET

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

declare const $: any;
import { client } from '../civClient'; // TODO: adjust import if needed
import { send_request } from '../../net/connection'; // TODO: adjust import if needed
import { packet_web_cma_set, packet_web_cma_clear } from '../../net/packetConstants'; // TODO: adjust import if needed
import { active_city } from '../clientState'; // TODO: adjust import if needed
import { client_is_observer } from '../clientCore'; // TODO: adjust import if needed
import { city_owner_player_id } from '../../data/city'; // TODO: adjust import if needed

// Governor Clipboard for copy/paste:
export let _cma_val_sliders: number[] = [1,0,0,0,0,0];
export let _cma_min_sliders: number[] = [0,0,0,0,0,0];
export let _cma_happy_slider: number = 0;
export let _cma_celebrate: boolean = false;
export let _cma_allow_disorder: boolean = false;
export let _cma_max_growth: boolean = false;
export let _cma_allow_specialists: boolean = true;
export let _cma_max_growth: boolean = false;

/**************************************************************************
  Init Governor tab - returns true if the tab was able to generate
**************************************************************************/
export function show_city_governor_tab(): boolean | void {
  // Reject cases which can't show the Governor:
  if (client_is_observer() || client.conn.playing == null) return false;
  if (!active_city) return false;
  if (city_owner_player_id(active_city) != client.conn.playing.playerno) {
    $("#city_governor_tab").html("City Governor available only for domestic cities.");
    return false;
  }
  if (typeof active_city['cm_parameter'] !== 'undefined') {
    $("#cma_food").prop('checked', active_city['cm_parameter']['factor'][0] >= 5);
    $("#cma_shield").prop('checked', active_city['cm_parameter']['factor'][1] >= 5);
    $("#cma_trade").prop('checked', active_city['cm_parameter']['factor'][2] >= 5);
    $("#cma_gold").prop('checked', active_city['cm_parameter']['factor'][3] >= 5);
    $("#cma_luxury").prop('checked', active_city['cm_parameter']['factor'][4] >= 5);
    $("#cma_science").prop('checked', active_city['cm_parameter']['factor'][5] >= 5);
  } else {
    $("#cma_food").prop('checked', false);
    $("#cma_shield").prop('checked', false);
    $("#cma_trade").prop('checked', false);
    $("#cma_gold").prop('checked', false);
    $("#cma_luxury").prop('checked', false);
    $("#cma_science").prop('checked', false);
  }
}

/**************************************************************************
  Sends new CMA parameters to the server, populated from the UI states.
**************************************************************************/
export function request_new_cma(city_id: any): void {
  const cm_parameter: any = {};

  if ($("#cma_food").prop('checked')) {
    _cma_val_sliders[0] = 6;
  } else {
    _cma_val_sliders[0] = 0;
  }

  if ($("#cma_shield").prop('checked')) {
    _cma_val_sliders[1] = 6;
  } else {
    _cma_val_sliders[1] = 0;
  }

  if ($("#cma_trade").prop('checked')) {
    _cma_val_sliders[2] = 6;
  } else {
    _cma_val_sliders[2] = 0;
  }

  if ($("#cma_gold").prop('checked')) {
    _cma_val_sliders[3] = 6;
  } else {
    _cma_val_sliders[3] = 0;
  }

  if ($("#cma_luxury").prop('checked')) {
    _cma_val_sliders[4] = 6;
  } else {
    _cma_val_sliders[4] = 0;
  }

  if ($("#cma_science").prop('checked')) {
    _cma_val_sliders[5] = 6;
  } else {
    _cma_val_sliders[5] = 0;
  }

  cm_parameter['minimal_surplus'] = [..._cma_min_sliders];
  cm_parameter['require_happy'] = _cma_celebrate;
  cm_parameter['allow_disorder'] = _cma_allow_disorder;
  cm_parameter['max_growth'] = _cma_max_growth;
  cm_parameter['allow_specialists'] = _cma_allow_specialists;
  cm_parameter['factor'] = [..._cma_val_sliders];
  cm_parameter['happy_factor'] = _cma_happy_slider;

  const cma_disabled = (!$("#cma_food").prop('checked') && !$("#cma_shield").prop('checked') && !$("#cma_trade").prop('checked')
                   && !$("#cma_gold").prop('checked') && !$("#cma_luxury").prop('checked') && !$("#cma_science").prop('checked') );

  if (!cma_disabled) {
    const packet = {"pid" : packet_web_cma_set,
                  "id" : city_id,
                  "cm_parameter" : cm_parameter };
    send_request(JSON.stringify(packet));
  } else {
    const packet = {"pid" : packet_web_cma_clear,
                  "id" : city_id};
    send_request(JSON.stringify(packet));
  }
}

/**************************************************************************
  Called when user clicks button to Enable/Disable governor.
**************************************************************************/
export function button_pushed_toggle_cma(): void {
  request_new_cma(active_city['id']);
}
