/**********************************************************************
    Freeciv-web - the web version of Freeciv. https://www.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project

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
declare const renderer: any;
declare const RENDERER_WEBGL: any;
declare function webgl_start_renderer(): void;
declare function set_chat_direction(direction: any): void;

export const PAGE_MAIN: number = 0;		/* Main menu, aka intro page.  */
export const PAGE_START: number = 1;		/* Start new game page.  */
export const PAGE_SCENARIO: number = 2;		/* Start new scenario page. */
export const PAGE_LOAD: number = 3;		/* Load saved game page. */
export const PAGE_NETWORK: number = 4;		/* Connect to network page.  */
export const PAGE_NATION: number = 5;		/* Select a nation page.  */
export const PAGE_GAME: number = 6;		/* In game page. */

let old_page: number = -1;

export function set_client_page(page: number): void {

  const new_page: number = page;

  /* If the page remains the same, don't do anything. */
  if (old_page === new_page) {
    return;
  }

  switch (old_page) {
  case -1:
    $("#pregame_page").remove();
    $("#pick_nation_dialog").remove();
    $("#pregame_settings").remove();
    break;
  case PAGE_SCENARIO:
    break;
  case PAGE_LOAD:
    break;
  case PAGE_NETWORK:
    break;
  case PAGE_GAME:
    break;
  default:
    break;
  }

  switch (new_page) {
  case PAGE_MAIN:
    break;
  case PAGE_START:
    break;
  case PAGE_NATION:
    break;
  case PAGE_GAME:
    $("#game_page").show();

    if (renderer === RENDERER_WEBGL) webgl_start_renderer();
    set_chat_direction(null);

    break;
  case PAGE_LOAD:
    /*update_load_page();*/
    break;
  case PAGE_SCENARIO:
    /*update_scenario_page();*/
    break;
  case PAGE_NETWORK:
    /*update_network_page();*/
    break;
  }

  old_page = new_page;
}

export function get_client_page(): number {
  return old_page;
}
