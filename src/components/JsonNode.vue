<script setup lang="ts">
import { ref, computed, inject } from 'vue'

interface Props {
  data: unknown
  keyName?: string | null
  depth?: number
  isLast?: boolean
  initialOpen?: boolean | null
}

const props = withDefaults(defineProps<Props>(), {
  keyName: null,
  depth: 0,
  isLast: true,
  initialOpen: null,
})

const defaultOpen = props.initialOpen !== null ? props.initialOpen : props.depth < 2
const isOpen = ref(defaultOpen)
const numberLines = inject<() => Promise<void>>('numberLines')
function toggle(): void {
  isOpen.value = !isOpen.value
  numberLines?.()
}

const type = computed(() => {
  if (props.data === null) return 'null'
  if (Array.isArray(props.data)) return 'array'
  return typeof props.data
})

const isCollapsible = computed(
  () => type.value === 'object' || type.value === 'array'
)

const entries = computed<[string, unknown][]>(() => {
  if (type.value === 'array') return (props.data as unknown[]).map((v, i) => [String(i), v])
  if (type.value === 'object') return Object.entries(props.data as Record<string, unknown>)
  return []
})

const childCount = computed(() => entries.value.length)

const summary = computed(() => {
  if (type.value === 'array') return `${childCount.value} item${childCount.value !== 1 ? 's' : ''}`
  if (type.value === 'object') return `${childCount.value} key${childCount.value !== 1 ? 's' : ''}`
  return ''
})

const bracket = computed(() => ({
  open: type.value === 'array' ? '[' : '{',
  close: type.value === 'array' ? ']' : '}',
}))

// Indentation in rem per depth level
const INDENT = 1.25
const indent = computed(() => `${props.depth * INDENT}rem`)
const closeIndent = computed(() => `${props.depth * INDENT}rem`)

function valueClass(t: string): string {
  switch (t) {
    case 'string': return 'text-green-700 dark:text-green-400'
    case 'number': return 'text-blue-600 dark:text-blue-400'
    case 'boolean': return 'text-orange-500 dark:text-orange-400'
    case 'null': return 'text-slate-400 dark:text-slate-500 italic'
    default: return ''
  }
}

function displayValue(): string {
  if (props.data === null) return 'null'
  if (type.value === 'string') return `"${props.data}"`
  return String(props.data)
}
</script>

<template>
  <!-- Opening / primitive row -->
  <span class="json-line">
    <span class="json-ln"></span>
    <span :style="{ paddingLeft: indent }">
    <!-- Key label -->
    <span v-if="keyName !== null">
      <span class="text-indigo-600 dark:text-indigo-400">"{{ keyName }}"</span>
      <span class="text-slate-400 dark:text-slate-500">: </span>
    </span>

    <!-- Primitive -->
    <template v-if="!isCollapsible">
      <span :class="valueClass(type)">{{ displayValue() }}</span>
      <span v-if="!isLast" class="text-slate-400">,</span>
    </template>

    <!-- Collapsible header -->
    <template v-else>
      <button
        @click="toggle"
        class="inline-flex items-center gap-0.5 hover:opacity-70 transition select-none focus:outline-none"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5"
          stroke-linecap="round" stroke-linejoin="round"
          class="text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-150"
          :class="isOpen ? 'rotate-90' : ''"
        ><path d="M9 18l6-6-6-6" /></svg>
        <span class="text-slate-500 dark:text-slate-400">{{ bracket.open }}</span>
      </button>

      <!-- Collapsed pill -->
      <template v-if="!isOpen">
        <span class="mx-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
          {{ summary }}
        </span>
        <span class="text-slate-500 dark:text-slate-400">{{ bracket.close }}</span>
        <span v-if="!isLast" class="text-slate-400">,</span>
      </template>
    </template>
    </span><!-- end content span -->
  </span><!-- end json-line -->

  <!-- Children (only when expanded) -->
  <template v-if="isCollapsible && isOpen">
    <JsonNode
      v-for="([k, v], i) in entries"
      :key="k"
      :data="v"
      :keyName="type === 'array' ? null : k"
      :depth="depth + 1"
      :isLast="i === entries.length - 1"
      :initialOpen="initialOpen"
    />

    <!-- Closing bracket row -->
    <span class="json-line">
      <span class="json-ln"></span>
      <span :style="{ paddingLeft: closeIndent }">
        <span class="text-slate-500 dark:text-slate-400">{{ bracket.close }}</span>
        <span v-if="!isLast" class="text-slate-400">,</span>
      </span>
    </span>
  </template>
</template>
