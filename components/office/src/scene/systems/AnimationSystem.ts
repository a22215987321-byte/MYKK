import type { AgentEntity } from '@/scene/entities/AgentEntity'

/** 驱动六位原创角色的程序化动作与表情 */
export class AnimationSystem {
  update(entities: Map<string, AgentEntity>, dt: number) {
    for (const entity of entities.values()) {
      entity.updateVisuals(entity.data.state, dt)
    }
  }
}
