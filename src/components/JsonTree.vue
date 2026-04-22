<script setup lang="ts">
import { computed, ref, nextTick, watch, onMounted, provide } from 'vue'
import JsonNode from './JsonNode.vue'

interface Props {
  value: string
}
const props = defineProps<Props>()

const parsed = computed(() => {
  try {
    return { data: JSON.parse(props.value), error: null }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : String(e) }
  }
})

// null = auto (depth < 2), true = all expanded, false = all collapsed
const treeKey = ref(0)
const forcedOpen = ref<boolean | null>(null)
const softWrap = ref(false)
const treeEl = ref<HTMLDivElement | null>(null)

async function numberLines(): Promise<void> {
  await nextTick()
  if (!treeEl.value) return
  treeEl.value.querySelectorAll<HTMLElement>('.json-ln').forEach((el, i) => {
    el.textContent = String(i + 1)
  })
}

function expandAll(): void { forcedOpen.value = true;  treeKey.value++ }
function collapseAll(): void { forcedOpen.value = false; treeKey.value++ }
function resetAuto(): void { forcedOpen.value = null;  treeKey.value++ }

watch(treeKey, numberLines)
watch(() => treeEl.value, numberLines)
onMounted(numberLines)
provide('numberLines', numberLines)
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Toolbar -->
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

    <!-- Parse error -->
    <div v-if="parsed.error" class="flex-1 flex items-center justify-center text-xs text-red-500 px-4">
      {{ parsed.error }}
    </div>

    <!-- Tree with line-number gutter -->
    <div v-else class="flex-1 flex overflow-auto">
      <!-- Gutter background strip -->
      <div class="sticky left-0 w-12 shrink-0 bg-slate-100 dark:bg-[#1e2028] z-10 self-stretch" />

      <!-- Scrollable content, offset left so numbers overlay the gutter -->
      <div ref="treeEl" class="flex-1 font-mono text-xs leading-relaxed py-4 -ml-12" :class="softWrap ? 'break-all' : 'whitespace-nowrap'">
        <div class="json-tree-content">
          <JsonNode
            :key="treeKey"
            :data="parsed.data"
            :depth="0"
            :isLast="true"
            :initialOpen="forcedOpen"
          />
        </div>
      </div>
    </div>
  </div>
</template>
