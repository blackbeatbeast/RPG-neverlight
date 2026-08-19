import { describe, expect, it } from 'vitest';
import type { ReactElement } from 'react';

import { StatusCard } from './index.js';

describe('StatusCard', () => {
  it('exposes a labelled semantic section', () => {
    const element = StatusCard({ children: 'Ready', title: 'Status' });
    const [heading] = element.props.children as ReactElement<{ children?: string }>[];

    expect(element.type).toBe('section');
    expect(element.props['aria-labelledby']).toBe('status-card-title');
    expect(heading?.props.children).toBe('Status');
  });
});
