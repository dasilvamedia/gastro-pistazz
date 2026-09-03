// Fehlercodes der RPCs redeem_deal / confirm_deal_redemption /
// confirm_stamp_reward (RAISE EXCEPTION 'code') auf HTTP-Status und deutsche
// Meldungen mappen. Geteilt von API-Routen und Seiten.
export const REDEEM_ERRORS: Record<string, { status: number; message: string }> = {
  deal_not_found:     { status: 404, message: 'Dieser Deal ist nicht mehr aktiv.' },
  profile_not_found:  { status: 404, message: 'Profil nicht gefunden.' },
  not_guest:          { status: 403, message: 'Nur Gaeste koennen Deals einloesen.' },
  deal_not_started:   { status: 400, message: 'Dieser Deal ist noch nicht verfuegbar.' },
  deal_expired:       { status: 400, message: 'Dieser Deal ist abgelaufen.' },
  deal_not_today:     { status: 400, message: 'Dieser Deal gilt heute nicht.' },
  deal_not_now:       { status: 400, message: 'Dieser Deal gilt gerade nicht. Schau dir die Uhrzeiten an.' },
  user_limit_reached: { status: 400, message: 'Du hast diesen Deal bereits eingeloest.' },
  deal_sold_out:      { status: 400, message: 'Dieser Deal ist leider ausgeschoepft.' },
  insufficient_points:{ status: 400, message: 'Du hast noch nicht genug Punkte fuer diesen Deal.' },
  code_not_found:     { status: 404, message: 'Code nicht gefunden. Bitte pruefe die Eingabe.' },
  wrong_restaurant:   { status: 403, message: 'Dieser Code gehoert zu einem anderen Restaurant.' },
  already_used:       { status: 409, message: 'Dieser Code wurde bereits eingeloest.' },
  expired:            { status: 409, message: 'Dieser Code ist abgelaufen. Der Gast hat seine Punkte zurueckbekommen.' },
}

export function mapRedeemError(message: string | undefined | null) {
  const key = (message ?? '').trim()
  return REDEEM_ERRORS[key] ?? { status: 500, message: 'Unerwarteter Fehler. Bitte erneut versuchen.' }
}
