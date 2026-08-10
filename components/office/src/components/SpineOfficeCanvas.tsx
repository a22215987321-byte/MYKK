import { useEffect, useRef } from 'react'
import { OfficeScene, type OfficeAgentClick } from '@/scene/OfficeScene'
import { AGENT_ROSTER } from '@/scene/layout/officeLayout'
import type { AgentState } from '@/types/agent'

type TaskLike = {
  assigneeId: string
  title: string
  progress?: number
  status: string
}

type SpineOfficeCanvasProps = {
  tasks: TaskLike[]
  paused: boolean
  onAgentSelect: (agentId: string) => void
}

function syncTasks(scene: OfficeScene, tasks: TaskLike[]) {
  for (const agent of AGENT_ROSTER) {
    const task = tasks.find(
      (item) =>
        item.assigneeId === agent.id &&
        (item.status === 'running' || item.status === 'queued'),
    )
    const state: AgentState = task
      ? task.status === 'running'
        ? 'working'
        : 'thinking'
      : 'idle'
    const detail = task
      ? `${task.title}${typeof task.progress === 'number' ? ` ${task.progress}%` : ''}`
      : undefined
    scene.syncExternalAgentState(agent.id, state, detail)
  }
}

export function SpineOfficeCanvas({
  tasks,
  paused,
  onAgentSelect,
}: SpineOfficeCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<OfficeScene | null>(null)
  const latestRef = useRef({ tasks, paused })
  const selectRef = useRef(onAgentSelect)

  latestRef.current = { tasks, paused }
  selectRef.current = onAgentSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let initialized = false

    const handleAgentClick = (event: OfficeAgentClick) => {
      selectRef.current(event.agent.id)
    }
    const scene = new OfficeScene({
      onAgentClick: handleAgentClick,
      enableAutoWorkflow: false,
    })
    sceneRef.current = scene

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect
      if (width <= 0 || height <= 0) return
      if (!initialized) {
        initialized = true
        void scene.init(host, width, height)
          .then(() => {
            if (disposed) return
            syncTasks(scene, latestRef.current.tasks)
            scene.setPaused(latestRef.current.paused)
          })
          .catch((error) => {
            console.error('Office scene failed to initialize', error)
          })
      } else {
        scene.resize(width, height)
      }
    })
    observer.observe(host)

    return () => {
      disposed = true
      observer.disconnect()
      scene.destroy()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    syncTasks(scene, tasks)
  }, [tasks])

  useEffect(() => {
    sceneRef.current?.setPaused(paused)
  }, [paused])

  return <div ref={hostRef} className="spine-office-canvas" />
}
