import { buildClientDirectory, filterClientDirectory, type ClientDirectoryRow } from './client-directory';
import type { ClientPass } from '@org/data';

function pass(userId: string, id: string, validUntil: string): ClientPass {
  return {
    id,
    user_id: userId,
    product_id: 'product-1',
    remaining: 8,
    valid_from: '2026-10-01T00:00:00.000Z',
    valid_until: validUntil,
    status: 'active',
    created_at: '2026-10-01T00:00:00.000Z',
  };
}

describe('buildClientDirectory', () => {
  const now = new Date('2026-10-09T12:00:00.000Z');

  it('joins the profile name, email, and the pass that is active now', () => {
    const rows = buildClientDirectory(
      [
        { id: 'student', name: '  Демо клієнт  ', role: 'student' },
        { id: 'coach', name: null, role: 'instructor' },
      ],
      new Map([['student', 'client.demo@pole.local']]),
      [
        pass('student', 'old', '2026-09-01T00:00:00.000Z'),
        pass('student', 'current', '2026-10-31T00:00:00.000Z'),
      ],
      now,
    );

    expect(rows).toEqual([
      {
        id: 'student',
        name: 'Демо клієнт',
        email: 'client.demo@pole.local',
        role: 'student',
        membership: expect.objectContaining({ id: 'current' }),
      },
      {
        id: 'coach',
        name: 'Без імені',
        email: null,
        role: 'instructor',
        membership: null,
      },
    ]);
  });
});

describe('filterClientDirectory', () => {
  const rows: ClientDirectoryRow[] = [
    {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
      name: 'Демо клієнт',
      email: 'client.demo@pole.local',
      role: 'student',
      membership: null,
    },
  ];

  it('matches name, email, or id', () => {
    expect(filterClientDirectory(rows, 'клієнт')).toHaveLength(1);
    expect(filterClientDirectory(rows, 'CLIENT.DEMO')).toHaveLength(1);
    expect(filterClientDirectory(rows, 'bbbbbbbb')).toHaveLength(1);
    expect(filterClientDirectory(rows, 'інструктор')).toHaveLength(0);
  });
});
