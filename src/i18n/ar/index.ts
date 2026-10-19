import { core } from './core';
import { tabs } from './tabs';
import { flows } from './flows';
import { profile } from './profile';
import { valet } from './valet';

export const ar: Record<string, string> = { ...valet, ...tabs, ...flows, ...profile, ...core } // core last: the menu's wording wins;
