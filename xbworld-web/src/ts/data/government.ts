/**
 * XBWorld — Government data module (migrated from government.js, data part only)
 *
 * Pure query/calculation functions for government types.
 *
 * NOTE: UI functions (show_government_dialog, update_govt_dialog,
 * start_revolution, set_req_government, send_player_change_government,
 * request_report) are NOT migrated — they remain in Legacy.
 */

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Returns the max tax rate for a given government.
 * FIXME: This shouldn't be hardcoded, but instead fetched from effects.
 */
export function governmentMaxRate(govtId: number): number {
  switch (govtId) {
    case 0: // Anarchy
      return 100;
    case 1: // Despotism
      return 60;
    case 2: // Monarchy
      return 70;
    case 3: // Communism
      return 80;
    case 4: // Republic
      return 80;
    case 5: // Democracy
      return 100;
    default:
      return 100;
  }
}

/**
 * Returns true iff the player can get the specified government.
 * Uses the JavaScript implementation of the requirement system.
 */
export function canPlayerGetGov(govtId: number): boolean {
  const client = (window as any).client;
  const governments = (window as any).governments as Record<number, any>;
  const playerHasWonder = (window as any).player_has_wonder as
    (playerno: number, wonderId: number) => boolean;
  const areReqsActive = (window as any).are_reqs_active as (
    ...args: any[]
  ) => boolean;
  const RPT_CERTAIN = (window as any).RPT_CERTAIN as number;

  return (
    playerHasWonder(client.conn.playing.playerno, 63) || // hack for Statue of Liberty
    areReqsActive(
      client.conn.playing,
      null,
      null,
      null,
      null,
      null,
      null,
      governments[govtId]['reqs'],
      RPT_CERTAIN,
    )
  );
}

// ---------------------------------------------------------------------------
// Expose to legacy
// ---------------------------------------------------------------------------

