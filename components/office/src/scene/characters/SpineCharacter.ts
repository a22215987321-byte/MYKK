import { Spine } from '@esotericsoftware/spine-pixi-v8'
import { Skin } from '@esotericsoftware/spine-core'
import { Container, Graphics } from 'pixi.js'
import type { AgentState } from '@/types/agent'
import {
  getSpineAtlasAlias,
  getSpineCharacterPack,
  getSpineSkeletonAlias,
  type SpineCharacterPack,
} from '@/scene/assets/loadSpineAssets'
import {
  type ChibiFacing,
  resolveChibiPresetAnim,
} from '@/scene/characters/chibiAgentPresets'
import { getChibiSkinName } from '@/scene/characters/chibiStickerSkins'

type AnimMap = Record<AgentState, string>

type PackConfig = {
  scale: number
  y: number
  shadow: { w: number; h: number; y: number }
  anim: AnimMap
  directional?: boolean
  timeScale?: Partial<Record<AgentState, number>>
  animLR?: Partial<Record<AgentState, { left: string; right: string }>>
}

type OriginalSkinProfile = {
  baseSkin: string
  hairSourceSkin?: string
  outfitSourceSkin?: string
  hairTint: number
  outfitTint: number
  accentTint: number
  skinTint: number
  hiddenSlots: readonly string[]
}

const ORIGINAL_SKIN_PROFILES: Record<string, OriginalSkinProfile> = {
  'strategy-agent': {
    baseSkin: 'misaki',
    hairSourceSkin: 'misaki',
    outfitSourceSkin: 'misaki',
    hairTint: 0xd17858,
    outfitTint: 0x5f9b7e,
    accentTint: 0xd56d45,
    skinTint: 0xffead9,
    hiddenSlots: ['glasses', 'glasses-side-l'],
  },
  'intelligence-agent': {
    baseSkin: 'erikari',
    hairSourceSkin: 'misaki',
    outfitSourceSkin: 'spineboy',
    hairTint: 0x4d9298,
    outfitTint: 0xf4e7c8,
    accentTint: 0xdb8b32,
    skinTint: 0xffeadb,
    hiddenSlots: [
      'hat-border',
      'hat-border-back',
      'hat-top',
      'strawberries-decoration',
      'arm-shoulder-decoration-l',
      'arm-shoulder-decoration-r',
      'bracelet-l',
      'bracelet-r',
      'leg-decoration-l',
      'leg-decoration-r',
    ],
  },
  'brand-agent': {
    baseSkin: 'spineboy',
    hairSourceSkin: 'erikari',
    outfitSourceSkin: 'misaki',
    hairTint: 0xb0649a,
    outfitTint: 0xf0d8bd,
    accentTint: 0xd48a55,
    skinTint: 0xffe6d6,
    hiddenSlots: [
      'arm-decoration-l',
      'arm-decoration-r',
      'arm-shoulder-decoration-l',
      'arm-shoulder-decoration-r',
      'glasses-shadow',
    ],
  },
  'systems-agent': {
    baseSkin: 'soeren',
    hairSourceSkin: 'soeren',
    outfitSourceSkin: 'spineboy',
    hairTint: 0x78869c,
    outfitTint: 0x536b83,
    accentTint: 0xb87345,
    skinTint: 0xffe3ce,
    hiddenSlots: ['beard', 'glasses-side-l', 'glasses-side-r'],
  },
  'analytics-agent': {
    baseSkin: 'luke',
    hairSourceSkin: 'sinisa',
    outfitSourceSkin: 'spineboy',
    hairTint: 0xb8bec6,
    outfitTint: 0xd7a453,
    accentTint: 0x4f8d82,
    skinTint: 0xffdfca,
    hiddenSlots: [
      'face-cover',
      'shield',
      'sword',
      'arm-shoulder-decoration-l',
      'arm-shoulder-decoration-r',
      'skirt',
    ],
  },
  'creative-agent': {
    baseSkin: 'mario',
    hairSourceSkin: 'mario',
    outfitSourceSkin: 'mario',
    hairTint: 0x698477,
    outfitTint: 0x3f7965,
    accentTint: 0x9f4b52,
    skinTint: 0xf2d0ba,
    hiddenSlots: [],
  },
}

const HAIR_SLOTS = new Set([
  'back-hair',
  'back-hair-long',
  'hair-front',
  'hair-side-l',
  'hair-side-r',
  'beard',
])

const OUTFIT_SLOTS = new Set([
  'body',
  'skirt',
  'leg-l',
  'leg-r',
  'glove-l',
  'glove-r',
])

const ACCENT_SLOTS = new Set([
  'belt',
  'body-decoration',
  'collar',
  'bracelet-l',
  'bracelet-r',
  'arm-decoration-l',
  'arm-decoration-r',
  'arm-shoulder-decoration-l',
  'arm-shoulder-decoration-r',
  'leg-decoration-l',
  'leg-decoration-r',
  'hair-decoration',
  'glasses',
  'glasses-side-l',
  'glasses-side-r',
])

const SKIN_SLOTS = new Set(['head-base', 'ear-l', 'ear-r'])

const ORIGINAL_STATE_ANIMS: Record<
  string,
  Partial<Record<AgentState, string>>
> = {
  'systems-agent': {
    idle: 'emotes/determined',
    working: 'emotes/idea',
    thinking: 'emotes/thinking',
    talking: 'emotes/hooray',
  },
}

const CHIBI_DIR_ANIM: Record<
  'idle' | 'walking',
  Record<ChibiFacing, string>
> = {
  idle: {
    front: 'movement/idle-front',
    back: 'movement/idle-back',
    left: 'movement/idle-right',
    right: 'movement/idle-left',
  },
  walking: {
    front: 'movement/trot-front',
    back: 'movement/trot-back',
    left: 'movement/trot-right',
    right: 'movement/trot-left',
  },
}

const PACK_CONFIG: Record<SpineCharacterPack, PackConfig> = {
  'chibi-stickers': {
    scale: 0.3,
    y: 2,
    shadow: { w: 24, h: 7, y: 4 },
    directional: true,
    anim: {
      idle: 'movement/idle-front',
      walking: 'movement/trot-front',
      working: 'movement/idle-front',
      thinking: 'emotes/thinking',
      talking: 'emotes/wave',
    },
    animLR: {
      idle: { left: 'movement/idle-left', right: 'movement/idle-right' },
      walking: { left: 'movement/trot-left', right: 'movement/trot-right' },
      working: { left: 'movement/idle-left', right: 'movement/idle-right' },
    },
    timeScale: { thinking: 0.85, talking: 1.1 },
  },
}

function applyHexColor(
  target: { set: (r: number, g: number, b: number, a: number) => unknown },
  color: number,
  alpha = 1,
) {
  target.set(
    ((color >> 16) & 0xff) / 255,
    ((color >> 8) & 0xff) / 255,
    (color & 0xff) / 255,
    alpha,
  )
}

export class SpineCharacter extends Container {
  private readonly agentId: string
  private readonly agentColor: number
  private spine: Spine | null = null
  private shadow: Graphics
  private currentAnim = ''
  private ready = false
  private pack: SpineCharacterPack | null = null
  private agentState: AgentState = 'idle'
  private customAnimation: string | undefined
  private facing: 1 | -1 = 1
  private viewFacing: ChibiFacing = 'front'

  constructor(agentId: string, agentColor: number) {
    super()
    this.agentId = agentId
    this.agentColor = agentColor
    this.shadow = new Graphics()
    this.addChild(this.shadow)
    this.createSpine()
  }

  get isReady() {
    return this.ready
  }

  setAgentColor(color: number) {
    if (!this.spine) return
    void color
    this.spine.skeleton.color.set(1, 1, 1, 1)
    this.applyOriginalSkinProfile()
  }

  setFacing(dir: 1 | -1) {
    if (!this.spine || !this.pack) return
    const cfg = PACK_CONFIG[this.pack]
    this.facing = dir

    if (cfg.directional) return

    const base = Math.abs(this.spine.scale.x) || cfg.scale
    this.spine.scale.x = base * dir
  }

  setViewFacing(facing: ChibiFacing) {
    if (!this.spine || !this.pack) return
    const changed = this.viewFacing !== facing
    this.viewFacing = facing
    const cfg = PACK_CONFIG[this.pack]
    if (!cfg.directional) return
    if (changed) this.currentAnim = ''
    this.applyAnimation()
    this.applyOriginalSkinProfile()
  }

  playState(state: AgentState, customAnimation?: string) {
    if (!this.spine || !this.ready || !this.pack) return
    this.agentState = state
    if (this.customAnimation !== customAnimation) {
      this.customAnimation = customAnimation
      this.currentAnim = ''
    }
    this.applyAnimation()
    this.applyOriginalSkinProfile()
  }

  playAnimation(animation: string) {
    if (!this.spine || !this.ready) return
    if (!this.spine.skeleton.data.findAnimation(animation)) {
      console.warn('[SpineCharacter] animation not found', animation)
      return
    }

    this.customAnimation = animation
    this.agentState = 'talking'
    this.currentAnim = animation
    const entry = this.spine.state.setAnimation(0, animation, true)
    this.spine.state.timeScale = 1
    if (entry) entry.mixDuration = 0.12
    this.applyOriginalSkinProfile()
  }

  getHeadOffsetY(): number {
    if (!this.spine || !this.pack) return -52

    const sy = Math.abs(this.spine.scale.y)
    const gap = 5
    const head = this.spine.skeleton.findBone('head-base')

    if (!head) return this.spine.y - 84

    const headCenter = this.spine.y + head.worldY * sy
    if (headCenter > this.spine.y + 2) return this.spine.y - 84
    return headCenter - 50 * sy - gap
  }

  private resolveAnimationName(): string {
    if (!this.pack) return 'idle'

    if (this.customAnimation && this.agentState !== 'walking') {
      return this.customAnimation
    }

    const originalStateAnimation =
      ORIGINAL_STATE_ANIMS[this.agentId]?.[this.agentState]
    if (originalStateAnimation && this.agentState !== 'walking') {
      return originalStateAnimation
    }

    if (this.pack === 'chibi-stickers') {
      if (this.agentState === 'walking') {
        return CHIBI_DIR_ANIM.walking[this.viewFacing]
      }
      if (
        this.agentState === 'idle' ||
        this.agentState === 'working' ||
        this.agentState === 'thinking'
      ) {
        return CHIBI_DIR_ANIM.idle[this.viewFacing]
      }
      if (
        this.agentState === 'talking' &&
        (this.viewFacing === 'left' || this.viewFacing === 'right')
      ) {
        return CHIBI_DIR_ANIM.idle[this.viewFacing]
      }
      const presetAnim = resolveChibiPresetAnim(this.agentId, this.agentState)
      if (presetAnim) return presetAnim
    }

    const cfg = PACK_CONFIG[this.pack]
    const lr = cfg.animLR?.[this.agentState]
    if (cfg.directional && lr) {
      return this.facing >= 0 ? lr.right : lr.left
    }
    return cfg.anim[this.agentState] ?? cfg.anim.idle
  }

  private applyAnimation() {
    if (!this.spine || !this.pack) return

    const cfg = PACK_CONFIG[this.pack]
    const animName = this.resolveAnimationName()

    if (cfg.directional) {
      const base = cfg.scale
      this.spine.scale.x = base
      this.spine.scale.y = base
    }

    const walkKey =
      this.pack === 'chibi-stickers' && this.agentState === 'walking'
        ? `${animName}@${this.viewFacing}`
        : animName

    if (walkKey === this.currentAnim) {
      this.spine.state.timeScale = cfg.timeScale?.[this.agentState] ?? 1
      return
    }

    if (!this.spine.skeleton.data.findAnimation(animName)) {
      const fallback = cfg.anim.idle
      this.spine.state.setAnimation(0, fallback, true)
      this.currentAnim = fallback
      return
    }

    this.currentAnim = walkKey
    const entry = this.spine.state.setAnimation(0, animName, true)
    this.spine.state.timeScale = cfg.timeScale?.[this.agentState] ?? 1
    if (entry) entry.mixDuration = 0.22
  }

  private buildOriginalSkin(
    spine: Spine,
    profile: OriginalSkinProfile,
  ): Skin | null {
    const baseSkin = spine.skeleton.data.findSkin(profile.baseSkin)
    if (!baseSkin) return null

    const skin = new Skin(`nexus-${this.agentId}`)
    skin.copySkin(baseSkin)

    if (profile.hairSourceSkin) {
      this.copySkinSlots(spine, skin, profile.hairSourceSkin, HAIR_SLOTS)
    }
    if (profile.outfitSourceSkin) {
      this.copySkinSlots(spine, skin, profile.outfitSourceSkin, OUTFIT_SLOTS)
    }

    return skin
  }

  private copySkinSlots(
    spine: Spine,
    targetSkin: Skin,
    sourceSkinName: string,
    slotNames: ReadonlySet<string>,
  ) {
    const sourceSkin = spine.skeleton.data.findSkin(sourceSkinName)
    if (!sourceSkin) return

    for (const slotName of slotNames) {
      const slotData = spine.skeleton.data.findSlot(slotName)
      if (!slotData) continue

      const attachments: ReturnType<Skin['getAttachments']> = []
      sourceSkin.getAttachmentsForSlot(slotData.index, attachments)
      for (const entry of attachments) {
        targetSkin.setAttachment(entry.slotIndex, entry.name, entry.attachment)
      }
    }
  }
  private applyOriginalSkinProfile() {
    if (!this.spine || this.pack !== 'chibi-stickers') return
    const profile = ORIGINAL_SKIN_PROFILES[this.agentId]
    if (!profile) return

    for (const slot of this.spine.skeleton.slots) {
      const name = slot.data.name
      if (profile.hiddenSlots.includes(name)) {
        slot.color.set(1, 1, 1, 0)
      } else if (HAIR_SLOTS.has(name)) {
        applyHexColor(slot.color, profile.hairTint)
      } else if (OUTFIT_SLOTS.has(name)) {
        applyHexColor(slot.color, profile.outfitTint)
      } else if (ACCENT_SLOTS.has(name)) {
        applyHexColor(slot.color, profile.accentTint)
      } else if (SKIN_SLOTS.has(name)) {
        applyHexColor(slot.color, profile.skinTint)
      } else {
        slot.color.set(1, 1, 1, 1)
      }
    }
  }

  private createSpine() {
    const pack = getSpineCharacterPack()
    if (!pack) return
    this.pack = pack

    try {
      const cfg = PACK_CONFIG[pack]
      const spine = Spine.from({
        skeleton: getSpineSkeletonAlias(),
        atlas: getSpineAtlasAlias(),
        scale: cfg.scale,
        autoUpdate: true,
      })

      if (pack === 'chibi-stickers') {
        const profile = ORIGINAL_SKIN_PROFILES[this.agentId]
        if (profile) {
          const originalSkin = this.buildOriginalSkin(spine, profile)
          if (originalSkin) {
            spine.skeleton.setSkin(originalSkin)
            spine.skeleton.setSlotsToSetupPose()
          }
        } else {
          const skinName = getChibiSkinName(this.agentId)
          if (spine.skeleton.data.findSkin(skinName)) {
            spine.skeleton.setSkinByName(skinName)
            spine.skeleton.setSlotsToSetupPose()
          }
        }
      }

      spine.state.data.defaultMix = 0.22
      spine.position.set(0, cfg.y)
      this.spine = spine
      this.ready = true
      this.addChild(spine)
      this.drawShadow(cfg.shadow)
      this.setAgentColor(this.agentColor)
      this.applyAnimation()
      this.applyOriginalSkinProfile()
    } catch (err) {
      console.error(`[SpineCharacter] 角色创建失败 (${pack}):`, err)
      this.ready = false
    }
  }

  private drawShadow(shadow: { w: number; h: number; y: number }) {
    this.shadow.clear()
    this.shadow.ellipse(0, shadow.y, shadow.w, shadow.h)
    this.shadow.fill({ color: 0x000000, alpha: 0.12 })
  }
}
