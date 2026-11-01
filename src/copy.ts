export const SIGN_OFF = [
  { id: 'pd', title: 'PD (Mara) definition', detail: '' },
  { id: 'recognition', title: 'Voucher recognition timing', detail: '' },
  { id: 'landing', title: 'Landing-fee ACTUAL basis', detail: '' },
  { id: 'beneficiary', title: '20% beneficiary', detail: '' },
  { id: 'flags', title: 'Reduced 40% / Divided by 13', detail: '' },
  { id: 'openings', title: 'Opening balances', detail: '' },
  { id: 'missing-books', title: 'Missing source books', detail: '' },
  { id: 'policy', title: 'Currency, FX, tax, limits', detail: '' },
] as const

export const PNL_WARNING = 'Provisional result. Incomplete source books.'

export const PD_NOTICE = 'PD definition pending sign-off.'

export const RECOGNITION_NOTICE = 'Recognition policy pending approval.'

export const SAMPLE_NOTICE = 'Design sample. Excluded from balances.'

export const PROTOTYPE_BANNER = 'Demo data. Not audited balances.'
