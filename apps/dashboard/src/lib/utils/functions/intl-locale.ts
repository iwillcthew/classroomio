import { get } from 'svelte/store';

import { locale } from './translations';

/** Active UI locale as a BCP 47 tag for `Intl` formatters, defaulting to Vietnamese. */
export function getIntlLocale(): string {
  return get(locale) || 'vi';
}
