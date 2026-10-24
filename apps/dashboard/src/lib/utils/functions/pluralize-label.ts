import pluralize from 'pluralize';
import { get } from 'svelte/store';

import { locale } from './translations';

/**
 * Returns `"{count} {label}"`, pluralizing `label` with English rules only while the active locale is English.
 */
export function pluralizeLabel(label: string, count: number): string {
  if (get(locale) !== 'en') return `${count} ${label}`;

  return pluralize(label, count, true);
}
