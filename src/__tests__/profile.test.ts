import { describe, it, expect } from 'vitest';
import { fetchMyRole, fetchMustChangePassword } from '../lib/profile';

describe('fetchMyRole — nunca assume admin por omissão', () => {
  it('retorna "barbeiro" quando não há userId', async () => {
    const role = await fetchMyRole(undefined);
    expect(role).toBe('barbeiro');
  });
});

describe('fetchMustChangePassword — nunca bloqueia por omissão (H10)', () => {
  it('retorna false quando não há userId', async () => {
    const result = await fetchMustChangePassword(undefined);
    expect(result).toBe(false);
  });
});
