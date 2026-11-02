import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { routeRuleFor } from '@/lib/route-access';
import { FIELD_TOOLS } from './DigitalToolkitLauncher';

describe('toolkit quick access', () => {
  it('opens only pages that exist and that technicians and contractors may use', () => {
    for (const tool of FIELD_TOOLS) {
      const path = tool.href.split('?')[0];
      expect(existsSync(join(process.cwd(), 'app/(app)', path, 'page.tsx')), path).toBe(true);
      for (const role of ['technician', 'contractor']) expect(routeRuleFor(path)?.roles, `${role} -> ${path}`).toContain(role);
    }
  });
});
