import { describe, expect, it } from 'vitest';

import { App } from './App.js';

describe('App', () => {
  it('renders the foundation shell', () => {
    const element = App();

    expect(element.type).toBe('main');
    expect(element.props.className).toBe('foundation-shell');
  });
});
