import { onMounted, onUnmounted, ref } from 'vue'
import { fetchLibraryJson, validateLibraryCatalog } from '@/core/utils/libraryResource'
import type { DictResource } from '@/core/types/types'

export function useLibraryCatalog(url: string) {
  const data = ref<DictResource[]>([])
  const isFetching = ref(true)
  const error = ref(false)
  let controller: AbortController | undefined
  let request = 0
  async function retry() {
    const current = ++request
    controller?.abort()
    controller = new AbortController()
    isFetching.value = true
    error.value = false
    try {
      const result = await fetchLibraryJson(url, controller.signal)
      if (!validateLibraryCatalog(result)) throw new Error('Invalid library catalog')
      if (current === request) data.value = (result as (DictResource & { hidden?: boolean })[]).filter(item => !item.hidden)
    } catch {
      if (current === request) error.value = true
    } finally {
      if (current === request) isFetching.value = false
    }
  }
  onMounted(retry)
  onUnmounted(() => { request++; controller?.abort() })
  return { data, isFetching, error, retry }
}
