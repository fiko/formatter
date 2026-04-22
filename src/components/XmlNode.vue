<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'

interface Props {
  node: Node
  depth?: number
  guides?: string[]
  initialOpen?: boolean | null
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
  guides: () => [],
  initialOpen: null,
})

const numberLines = inject<() => Promise<void>>('numberLines')
const indentProp = inject<Ref<number | string>>('indent')

const elementChildren = computed<Element[]>(() => {
  if (props.node.nodeType !== 1) return []
  return Array.from((props.node as Element).children)
})

const hasElementChildren = computed(() => elementChildren.value.length > 0)

const textContent = computed(() => {
  if (props.node.nodeType !== 1) return ''
  const el = props.node as Element
  if (hasElementChildren.value) return ''
  return (el.textContent ?? '').trim()
})

const isCollapsible = computed(() => hasElementChildren.value)

const defaultOpen = props.initialOpen !== null ? props.initialOpen : true
const isOpen = ref(defaultOpen)

function toggle(): void {
  isOpen.value = !isOpen.value
  numberLines?.()
}

const tagName = computed(() =>
  props.node.nodeType === 1 ? (props.node as Element).nodeName : ''
)

const attrs = computed<{ name: string; value: string }[]>(() => {
  if (props.node.nodeType !== 1) return []
  return Array.from((props.node as Element).attributes).map((a) => ({
    name: a.name,
    value: a.value,
  }))
})

const summary = computed(() => {
  const n = elementChildren.value.length
  return `${n} child${n !== 1 ? 'ren' : ''}`
})

const indentRem = computed(() => {
  const raw = indentProp?.value ?? 2
  const spaces = raw === 'tab' ? 4 : Math.max(1, Number(raw))
  return spaces * 0.55
})

const indent = computed(() => `${props.depth * indentRem.value}rem`)

const myGuideLeft = computed(() =>
  `calc(3rem + ${props.depth * indentRem.value}rem + 0.3rem)`
)

const childGuides = computed(() =>
  isOpen.value ? [...props.guides, myGuideLeft.value] : props.guides
)

const nodeType = computed(() => props.node.nodeType)
const commentText = computed(() =>
  nodeType.value === 8 ? (props.node.nodeValue ?? '') : ''
)
const piText = computed(() => {
  if (nodeType.value !== 7) return ''
  const pi = props.node as ProcessingInstruction
  return `<?${pi.target} ${pi.data}?>`
})
</script>

<template>
  <!-- Element node -->
  <template v-if="nodeType === 1">
    <!-- Opening line -->
    <span class="json-line relative">
      <span class="json-ln">
        <span class="json-ln-num"></span>
        <button
          v-if="isCollapsible"
          @click="toggle"
          class="json-ln-toggle"
          :aria-label="isOpen ? 'Collapse' : 'Expand'"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5"
            stroke-linecap="round" stroke-linejoin="round"
            class="transition-transform duration-150"
            :class="isOpen ? 'rotate-90' : ''"
          ><path d="M9 18l6-6-6-6" /></svg>
        </button>
        <span v-else class="json-ln-toggle" aria-hidden="true" />
      </span>
      <span
        v-for="(g, gi) in guides"
        :key="gi"
        class="absolute top-0 bottom-0 pointer-events-none border-l border-dashed border-slate-300 dark:border-white/15"
        :style="{ left: g }"
      />
      <span :style="{ paddingLeft: indent }">
        <span class="text-slate-500 dark:text-slate-400">&lt;</span>
        <span class="text-rose-600 dark:text-rose-400">{{ tagName }}</span>
        <template v-for="(a, i) in attrs" :key="i">
          <span class="text-slate-400"> </span>
          <span class="text-indigo-600 dark:text-indigo-400">{{ a.name }}</span>
          <span class="text-slate-400">=</span>
          <span class="text-green-700 dark:text-green-400">"{{ a.value }}"</span>
        </template>
        <template v-if="isCollapsible">
          <span class="text-slate-500 dark:text-slate-400">&gt;</span>
          <template v-if="!isOpen">
            <span class="mx-1 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
              {{ summary }}
            </span>
            <span class="text-slate-500 dark:text-slate-400">&lt;/</span><span
              class="text-rose-600 dark:text-rose-400"
            >{{ tagName }}</span><span class="text-slate-500 dark:text-slate-400">&gt;</span>
          </template>
        </template>
        <template v-else-if="textContent">
          <span class="text-slate-500 dark:text-slate-400">&gt;</span>
          <span class="text-slate-800 dark:text-slate-200">{{ textContent }}</span>
          <span class="text-slate-500 dark:text-slate-400">&lt;/</span><span
            class="text-rose-600 dark:text-rose-400"
          >{{ tagName }}</span><span class="text-slate-500 dark:text-slate-400">&gt;</span>
        </template>
        <template v-else>
          <span class="text-slate-500 dark:text-slate-400"> /&gt;</span>
        </template>
      </span>
    </span>

    <!-- Children -->
    <template v-if="isCollapsible && isOpen">
      <XmlNode
        v-for="(c, i) in elementChildren"
        :key="i"
        :node="c"
        :depth="depth + 1"
        :guides="childGuides"
        :initialOpen="initialOpen"
      />

      <!-- Closing tag -->
      <span class="json-line relative">
        <span class="json-ln">
          <span class="json-ln-num"></span>
          <span class="json-ln-toggle" aria-hidden="true" />
        </span>
        <span
          v-for="(g, gi) in guides"
          :key="gi"
          class="absolute top-0 bottom-0 pointer-events-none border-l border-dashed border-slate-300 dark:border-white/15"
          :style="{ left: g }"
        />
        <span :style="{ paddingLeft: indent }">
          <span class="text-slate-500 dark:text-slate-400">&lt;/</span><span
            class="text-rose-600 dark:text-rose-400"
          >{{ tagName }}</span><span class="text-slate-500 dark:text-slate-400">&gt;</span>
        </span>
      </span>
    </template>
  </template>

  <!-- Comment node -->
  <span v-else-if="nodeType === 8" class="json-line relative">
    <span class="json-ln">
      <span class="json-ln-num"></span>
      <span class="json-ln-toggle" aria-hidden="true" />
    </span>
    <span
      v-for="(g, gi) in guides"
      :key="gi"
      class="absolute top-0 bottom-0 pointer-events-none border-l border-dashed border-slate-300 dark:border-white/15"
      :style="{ left: g }"
    />
    <span :style="{ paddingLeft: indent }" class="text-slate-400 italic">&lt;!--{{ commentText }}--&gt;</span>
  </span>

  <!-- Processing instruction -->
  <span v-else-if="nodeType === 7" class="json-line relative">
    <span class="json-ln">
      <span class="json-ln-num"></span>
      <span class="json-ln-toggle" aria-hidden="true" />
    </span>
    <span
      v-for="(g, gi) in guides"
      :key="gi"
      class="absolute top-0 bottom-0 pointer-events-none border-l border-dashed border-slate-300 dark:border-white/15"
      :style="{ left: g }"
    />
    <span :style="{ paddingLeft: indent }" class="text-purple-600 dark:text-purple-400">{{ piText }}</span>
  </span>
</template>
