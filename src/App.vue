<script setup>
import { ref, computed, nextTick, watch } from 'vue'
import { format } from './formatters.js'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'
import 'highlight.js/styles/atom-one-dark.css'

hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('javascript', javascript)

const language = ref('json')
const mode = ref('beautify')
const input = ref('')
const error = ref('')

const hasInput = computed(() => input.value.trim().length > 0)

const output = computed(() => {
  try {
    error.value = ''
    return format(language.value, mode.value, input.value)
  } catch (e) {
    error.value = e.message
    return ''
  }
})

const hljsLang = computed(() =>
  language.value === 'js' ? 'javascript' : language.value
)

const inputLines = computed(() => {
  const n = input.value.split('\n').length || 1
  return Array.from({ length: n }, (_, i) => i + 1)
})

const outputHighlighted = computed(() => {
  if (!output.value) return ''
  const html = hljs.highlight(output.value, { language: hljsLang.value }).value
  return html
    .split('\n')
    .map(
      (line, i) =>
        `<div class="flex"><span class="select-none w-10 pr-3 text-right text-slate-400/60">${
          i + 1
        }</span><span class="flex-1">${line || ' '}</span></div>`
    )
    .join('')
})

const languages = [
  { id: 'json', label: 'JSON' },
  { id: 'xml', label: 'XML' },
  { id: 'js', label: 'JavaScript' },
]

const inputArea = ref(null)
const inputGutter = ref(null)
function onInputScroll() {
  if (inputGutter.value && inputArea.value) {
    inputGutter.value.scrollTop = inputArea.value.scrollTop
  }
}

function copyOutput() {
  if (output.value) navigator.clipboard.writeText(output.value)
}
function clearAll() {
  input.value = ''
}
</script>

<template>
  <div class="h-screen w-screen flex overflow-hidden">
    <!-- INPUT PANE -->
    <section
      class="relative flex flex-col bg-brand-dark text-indigo-100 transition-all duration-500 ease-in-out"
      :class="hasInput ? 'w-1/3' : 'w-1/2'"
    >
      <!-- Sticky header -->
      <header class="sticky top-0 z-20 px-6 py-4 bg-brand-dark/95 backdrop-blur border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold tracking-tight">Code Formatter <span class="text-indigo-400 font-normal">(by Fiko)</span></h1>
          <p class="text-xs text-indigo-300/70">JSON · XML · JavaScript</p>
        </div>
        <button
          @click="clearAll"
          class="text-xs text-indigo-300 hover:text-white transition"
        >
          Clear
        </button>
      </header>

      <!-- Editor area: gutter + textarea -->
      <div class="flex-1 flex overflow-hidden relative">
        <div
          ref="inputGutter"
          class="w-12 shrink-0 overflow-hidden bg-black/20 text-right font-mono text-xs leading-relaxed text-indigo-400/50 select-none py-5"
        >
          <div
            v-for="n in inputLines"
            :key="n"
            class="px-2"
          >
            {{ n }}
          </div>
        </div>
        <textarea
          ref="inputArea"
          v-model="input"
          @scroll="onInputScroll"
          spellcheck="false"
          class="flex-1 bg-transparent pl-3 pr-6 py-5 pb-32 font-mono text-xs leading-relaxed resize-none focus:outline-none placeholder-indigo-400/40 overflow-auto"
          placeholder="Paste your JSON, XML or JavaScript here…"
        ></textarea>
      </div>

      <!-- Sticky footer with gradient -->
      <footer class="absolute bottom-0 left-0 right-0 z-10 px-6 pt-12 pb-5 bg-gradient-to-t from-brand-dark via-brand-dark/95 to-transparent pointer-events-none">
        <div class="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div class="inline-flex rounded-lg bg-white/10 backdrop-blur p-1">
            <button
              v-for="l in languages"
              :key="l.id"
              @click="language = l.id"
              class="px-3 py-1 text-xs font-medium rounded-md transition"
              :class="language === l.id
                ? 'bg-indigo-500 text-white shadow'
                : 'text-indigo-200 hover:text-white'"
            >
              {{ l.label }}
            </button>
          </div>
          <div class="inline-flex rounded-lg bg-white/10 backdrop-blur p-1">
            <button
              @click="mode = 'beautify'"
              class="px-3 py-1 text-xs font-medium rounded-md transition"
              :class="mode === 'beautify'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-indigo-200 hover:text-white'"
            >
              Beautify
            </button>
            <button
              @click="mode = 'minify'"
              class="px-3 py-1 text-xs font-medium rounded-md transition"
              :class="mode === 'minify'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-indigo-200 hover:text-white'"
            >
              Minify
            </button>
          </div>
        </div>
      </footer>
    </section>

    <!-- OUTPUT PANE -->
    <section
      class="relative flex flex-col bg-[#282c34] transition-all duration-500 ease-in-out"
      :class="hasInput ? 'w-2/3' : 'w-1/2'"
    >
      <header class="sticky top-0 z-10 px-6 py-4 bg-[#282c34]/95 backdrop-blur border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-white tracking-tight">Output</h2>
          <p class="text-xs text-slate-400 capitalize">{{ language }} · {{ mode }}</p>
        </div>
        <button
          @click="copyOutput"
          :disabled="!output"
          class="text-xs px-3 py-1.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Copy
        </button>
      </header>

      <div class="flex-1 overflow-auto relative">
        <pre
          v-if="output"
          class="hljs px-4 py-5 font-mono text-xs leading-relaxed !bg-transparent"
        ><code v-html="outputHighlighted"></code></pre>
        <div
          v-else
          class="h-full flex items-center justify-center text-slate-500 text-sm"
        >
          Output will appear here…
        </div>

        <div
          v-if="error"
          class="sticky bottom-3 mx-3 text-xs px-3 py-2 rounded-md bg-red-900/40 text-red-200 border border-red-700/50"
        >
          {{ error }}
        </div>
      </div>
    </section>
  </div>
</template>
