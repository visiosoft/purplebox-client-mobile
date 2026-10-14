import { core } from './core';
import { tabs } from './tabs';
import { flows } from './flows';
import { profile } from './profile';

export const ar: Record<string, string> = { ...tabs, ...flows, ...profile, ...core } // core last: the menu's wording wins;
