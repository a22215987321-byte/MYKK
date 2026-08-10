import { AGENT_ROSTER } from '@/scene/layout/officeLayout'

/** Spine Chibi Stickers 可用皮膚（9 套，角色會輪換復用） */
export const CHIBI_CHARACTER_SKINS = [
  'misaki',
  'erikari',
  'nate',
  'harri',
  'luke',
  'soeren',
  'mario',
  'sinisa',
  'spineboy',
] as const

const SKIN_BY_AGENT_ID = {
  'strategy-agent': 'misaki',
  'code-agent': 'erikari',
  'brand-agent': 'harri',
  'engineering-agent': 'nate',
  'analytics-agent': 'luke',
  'creative-agent': 'mario',
} as const

const SKIN_BY_ID = new Map(
  AGENT_ROSTER.map((agent, index) => [
    agent.id,
    SKIN_BY_AGENT_ID[agent.id as keyof typeof SKIN_BY_AGENT_ID]
      ?? CHIBI_CHARACTER_SKINS[index % CHIBI_CHARACTER_SKINS.length],
  ]),
)

export function getChibiSkinName(agentId: string): string {
  return SKIN_BY_ID.get(agentId) ?? 'spineboy'
}
