import { describe, expect, it } from 'vitest';

import { getDefaultTemplate } from '../src/templates';

describe('getDefaultTemplate', () => {
  it('uses the internal MP Learning branding by default', () => {
    const rendered = getDefaultTemplate('<p>System email</p>');

    expect(rendered).toContain('MP Transformation · Learning');
    expect(rendered).not.toContain('classroomio.com');
  });

  it('keeps internal branding when the email language is changed', () => {
    const rendered = getDefaultTemplate('<p>Courriel étudiant</p>', undefined, 'fr', {
      rightsReserved: 'Tous droits réservés.',
      website: 'Site web',
      terms: 'Conditions',
      privacy: 'Confidentialité'
    });

    expect(rendered).toContain('<html lang="fr">');
    expect(rendered).toContain('MP Transformation · Learning');
    expect(rendered).toContain('<p>Courriel étudiant</p>');
  });
});
