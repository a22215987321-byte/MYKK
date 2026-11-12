// EVONCHAT adaptation, 2026-11-03. Only the owning frame may change activity.
import { cancelWordPracticeAudio } from '@/core/hooks/sound'
export default defineNuxtPlugin(() => {
  const current = window as any
  current.__evonTypewordsActive = window.parent === window
  const stopAudio = () => {
    cancelWordPracticeAudio()
    document.querySelectorAll('audio, video').forEach(media => (media as HTMLMediaElement).pause())
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  }
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return
    if (event.data?.type !== 'evonchat:typewords-active' || typeof event.data.active !== 'boolean') return
    current.__evonTypewordsActive = event.data.active
    if (!event.data.active) stopAudio()
    document.dispatchEvent(new Event('visibilitychange'))
  })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAudio()
  })
  if (window.parent !== window) window.parent.postMessage({ type: 'evonchat:typewords-ready' }, window.location.origin)
})
