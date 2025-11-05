// src/shared/personas.ts

import type { PersonaConfig } from "@/types/main.types";

export const SYSTEM_PERSONAS: PersonaConfig[] = [
  {
    id: 'default',
    label: 'Default',
    description: 'Your normal voice, relaxed and natural.',
  },
  {
    id: 'buddy',
    label: 'Buddy',
    description: 'Chill, friendly, a bit playful.',
  },
  {
    id: 'ceo',
    label: 'CEO',
    description: 'Confident, concise, professional.',
  },
  {
    id: 'playboy',
    label: 'Playboy',
    description: 'Sexy, charismatic, flirty.',
  },
  {
    id: 'brother',  
    label: 'Brother',
    description: 'Brotherly, supportive, a bit playful.',
  }
];

export const SYSTEM_PERSONAS_BY_ID: Record<string, PersonaConfig> =
  SYSTEM_PERSONAS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<string, PersonaConfig>);