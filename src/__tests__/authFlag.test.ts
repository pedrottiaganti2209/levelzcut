import { describe, it, expect } from 'vitest';
import { computeIsAuthRequired } from '../lib/supabase';

describe('computeIsAuthRequired', () => {
  it('is false when Supabase is not configured and the flag is unset (local/dev mode)', () => {
    expect(computeIsAuthRequired(false, undefined)).toBe(false);
  });

  it('is false when Supabase is configured but the flag is unset — this is the H1 regression: ' +
    'the login gate must never turn on for existing users just because env vars are present', () => {
    expect(computeIsAuthRequired(true, undefined)).toBe(false);
  });

  it('is true only when Supabase is configured AND the flag is explicitly "true"', () => {
    expect(computeIsAuthRequired(true, 'true')).toBe(true);
  });

  it('is false when the flag is "true" but Supabase is not configured (no client to authenticate against)', () => {
    expect(computeIsAuthRequired(false, 'true')).toBe(false);
  });
});
