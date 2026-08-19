import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PREFERENCES,
  getCommandForKey,
  getCommandsForScreen,
  isEditableTarget,
  loadPreferences,
  serializePreferences,
} from './app-model.js';

describe('semantic shell model', () => {
  it('keeps preferences safe, versioned, and serializable', () => {
    const preferences = loadPreferences(serializePreferences(DEFAULT_PREFERENCES));

    expect(preferences).toEqual(DEFAULT_PREFERENCES);
    expect(loadPreferences('{"theme":"unknown"}').theme).toBe('retro');
    expect(loadPreferences('{not-json').locale).toBe('ja');
  });

  it('exposes the same town command structure for touch and keyboard', () => {
    const commands = getCommandsForScreen('town', 0, DEFAULT_PREFERENCES);

    expect(commands.map((command) => command.key)).toEqual(['1', '2', '3', '4', '5', '6', '7']);
    expect(getCommandForKey(commands, '1')?.action).toEqual({ target: 'routes', type: 'navigate' });
  });

  it('maps Escape to the visible back command', () => {
    const commands = getCommandsForScreen('routes', 0, DEFAULT_PREFERENCES);

    expect(getCommandForKey(commands, 'Escape')?.key).toBe('0');
  });

  it('pauses shortcuts in editable controls', () => {
    expect(isEditableTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: 'textarea' } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: 'button' } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget({ isContentEditable: true } as unknown as EventTarget)).toBe(true);
  });
});
