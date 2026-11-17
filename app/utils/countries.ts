// Static ISO 3166-1 alpha-2 country list for the BPNR "Negara" select.
// Names come from the browser's Indonesian region names (Intl.DisplayNames);
// Indonesia itself is excluded because BPNR recipients are foreign taxpayers.
// The stored value is the country name (backend column is a free string).

const COUNTRY_CODES = `
AF AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BA BW BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT VA HN HK HU IS IN IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR XK KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA SS ES LK SD SR SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UY UZ VU VE VN VG VI WF EH YE ZM ZW
`.trim().split(/\s+/)

let cached: { label: string, value: string }[] | null = null

/** Country options sorted by Indonesian name. */
export function foreignCountryOptions(): { label: string, value: string }[] {
  if (cached) return cached
  let names: Intl.DisplayNames | null = null
  try {
    names = new Intl.DisplayNames(['id'], { type: 'region' })
  } catch {
    names = null
  }
  const items = COUNTRY_CODES.map((code) => {
    const name = (names?.of(code) ?? code) as string
    return { label: name, value: name }
  })
  cached = items.sort((a, b) => a.label.localeCompare(b.label, 'id'))
  return cached
}
