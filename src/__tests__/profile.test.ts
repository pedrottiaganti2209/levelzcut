import { describe, it, expect } from 'vitest';
import { fetchMyRole } from '../lib/profile';

describe('fetchMyRole — nunca assume admin por omissão', () => {
  it('retorna "barbeiro" quando não há userId', async () => {
    const role = await fetchMyRole(undefined);
    expect(role).toBe('barbeiro');
  });
});
