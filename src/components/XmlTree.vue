<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, provide, toRef } from 'vue'
import XmlNode from './XmlNode.vue'

interface Props {
  value: string
  indent?: number | string
}
const props = withDefaults(defineProps<Props>(), { indent: 2 })

const xmlDecl = computed(() => {
  const m = props.value.match(/^\s*(<\?xml\b[^?]*\?>)/)
  return m ? m[1] : ''
})

const parsed = computed(() => {
  try {
    const doc = new DOMParser().parseFromString(props.value, 'text/xml')
    const err = doc.querySelector('parsererror')
    if (err) return { nodes: [] as Node[], error: err.textContent || 'Parse error' }
    const nodes: Node[] = []
    doc.childNodes.forEach((n) => {
      if (n.nodeType === 1 || n.nodeType === 7 || n.nodeType === 8) nodes.push(n)
    })
    return { nodes, error: null as string | null }
  } catch (e) {
    return { nodes: [], error: e instanceof Error ? e.message : String(e) }
  }
})

const treeKey = ref(0)
const forcedOpen = ref<boolean | null>(null)
const softWrap = ref(false)
const treeEl = ref<HTMLDivElement | null>(null)

async function numberLines(): Promise<void> {
  await nextTick()
  if (!treeEl.value) return
  treeEl.value.querySelectorAll<HTMLElement>('.json-ln-num').forEach((el, i) => {
    el.textContent = String(i + 1)
  })
}

function expandAll(): void { forcedOpen.value = true;  treeKey.value++ }
function collapseAll(): void { forcedOpen.value = false; treeKey.value++ }

watch(treeKey, numberLines)
watch(() => treeEl.value, numberLines)
watch(() => props.value, numberLines)
onMounted(numberLines)
provide('numberLines', numberLines)
provide('indent', toRef(props, 'indent'))
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center gap-3 px-5 py-2 border-b border-slate-200 dark:border-white/10 text-[11px] text-slate-500 dark:text-slate-400 select-none">
      <button @click="expandAll"  class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Expand all</button>
      <span class="text-slate-300 dark:text-white/20">|</span>
      <button @click="collapseAll" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition">Collapse all</button>
      <span class="text-slate-300 dark:text-white/20">|</span>
      <button
        @click="softWrap = !softWrap"
        class="flex items-center gap-1 transition"
        :class="softWrap
          ? 'text-indigo-400 dark:text-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400'
          : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'"
        title="Toggle soft wrap"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        Soft wrap
      </button>
    </div>

    <div v-if="parsed.error" class="flex-1 flex items-center justify-center text-xs text-red-500 px-4">
      {{ parsed.error }}
    </div>

    <div v-else class="flex-1 flex overflow-auto">
      <div class="sticky left-0 w-12 shrink-0 bg-slate-100 dark:bg-[#1e2028] z-10 self-stretch" />

      <div ref="treeEl" class="flex-1 font-mono text-xs leading-relaxed py-4 -ml-12" :class="softWrap ? 'break-all' : 'whitespace-nowrap'">
        <div class="json-tree-content" :key="treeKey">
          <span v-if="xmlDecl" class="json-line relative">
            <span class="json-ln">
              <span class="json-ln-num"></span>
              <span class="json-ln-toggle" aria-hidden="true" />
            </span>
            <span class="text-purple-600 dark:text-purple-400">{{ xmlDecl }}</span>
          </span>
          <XmlNode
            v-for="(n, i) in parsed.nodes"
            :key="i"
            :node="n"
            :depth="0"
            :initialOpen="forcedOpen"
          />
        </div>
      </div>
    </div>
  </div>
</template>
