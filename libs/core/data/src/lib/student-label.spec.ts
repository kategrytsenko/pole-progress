import { studentLabel } from './students.api';

describe('studentLabel', () => {
  it('uses the trimmed profile name', () => {
    expect(studentLabel('  Демо клієнт  ')).toBe('Демо клієнт');
  });

  it('falls back when the name is missing', () => {
    expect(studentLabel(null)).toBe('Без імені');
    expect(studentLabel(undefined)).toBe('Без імені');
    expect(studentLabel('   ')).toBe('Без імені');
  });
});
