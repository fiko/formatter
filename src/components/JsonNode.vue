<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'

interface Props {
  data: unknown
  keyName?: string | null
  depth?: number
  isLast?: boolean
  initialOpen?: boolean | null
  guides?: string[]  // inherited left-positions (CSS) of ancestor guide lines
}

const props = withDefaults(defineProps<Props>(), {
  keyName: null,
  depth: 0,
  isLast: true,
  initialOpen: null,
  guides: () => [],
})

const numberLines = inject<() => Promise<void>>('numberLines')
const indentProp = inject<Ref<number | string>>('indent')

function toggle(): void {
  isOpen.value = !isOpen.value
  numberLines?.()
}

const defaultOpen = props.initialOpen !== null ? props.initialOpen : props.depth < 2
const isOpen = ref(defaultOpen)

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

const indentRem = computed(() => {
  const raw = indentProp?.value ?? 2
  const spaces = raw === 'tab' ? 4 : Math.max(1, Number(raw))
  return spaces * 0.55
})

const indent = computed(() => `${props.depth * indentRem.value}rem`)

// Guide line position for THIS node's children:
// gutter (3rem) + current depth indent + half-chevron offset
const myGuideLeft = computed(() =>
  `calc(3rem + ${props.depth * indentRem.value}rem + 0.5rem)`
)

// Guides to pass down to children = inherited guides + this node's guide (when open)
const childGuides = computed(() =>
  isOpen.value ? [...props.guides, myGuideLeft.value] : props.guides
)

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
  <span class="json-line relative">
    <span class="json-ln"></span>
    <!-- Inherited guide lines drawn inside this row -->
    <span
      v-for="(g, gi) in guides"
      :key="gi"
      class="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 pointer-events-none"
      :style="{ left: g }"
    />
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
    </span>
  </span>

  <!-- Children (flat — no wrapper div so line numbers stay correct) -->
  <template v-if="isCollapsible && isOpen">
    <JsonNode
      v-for="([k, v], i) in entries"
      :key="k"
      :data="v"
      :keyName="type === 'array' ? null : k"
      :depth="depth + 1"
      :isLast="i === entries.length - 1"
      :initialOpen="initialOpen"
      :guides="childGuides"
    />

    <!-- Closing bracket row -->
    <span class="json-line relative">
      <span class="json-ln"></span>
      <span
        v-for="(g, gi) in guides"
        :key="gi"
        class="absolute top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 pointer-events-none"
        :style="{ left: g }"
      />
      <span :style="{ paddingLeft: indent }">
        <span class="text-slate-500 dark:text-slate-400">{{ bracket.close }}</span>
        <span v-if="!isLast" class="text-slate-400">,</span>
      </span>
    </span>
  </template>
</template>
