<script setup>
import { ref, computed } from 'vue'
import { format } from './formatters.js'

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

const languages = [
  { id: 'json', label: 'JSON' },
  { id: 'xml', label: 'XML' },
  { id: 'js', label: 'JavaScript' },
]

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
      <header class="sticky top-0 z-10 px-6 py-4 bg-brand-dark/95 backdrop-blur border-b border-white/10 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold tracking-tight">Code Formatter</h1>
          <p class="text-xs text-indigo-300/70">JSON · XML · JavaScript</p>
        </div>
        <button
          @click="clearAll"
          class="text-xs text-indigo-300 hover:text-white transition"
        >
          Clear
        </button>
      </header>

      <!-- Scrollable input -->
      <div class="flex-1 overflow-auto">
        <textarea
          v-model="input"
          spellcheck="false"
          class="w-full h-full min-h-full bg-transparent px-6 py-5 pb-32 font-mono text-sm leading-relaxed resize-none focus:outline-none placeholder-indigo-400/40"
          placeholder="Paste your JSON, XML or JavaScript here…"
        ></textarea>
      </div>

      <!-- Sticky footer with gradient (bottom -> top) -->
      <footer class="absolute bottom-0 left-0 right-0 z-10 px-6 pt-10 pb-5 bg-gradient-to-t from-brand-dark via-brand-dark/90 to-transparent pointer-events-none">
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
      class="relative flex flex-col bg-white/90 backdrop-blur transition-all duration-500 ease-in-out"
      :class="hasInput ? 'w-2/3' : 'w-1/2'"
    >
      <header class="sticky top-0 z-10 px-6 py-4 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-brand-dark tracking-tight">Output</h2>
          <p class="text-xs text-slate-500 capitalize">{{ language }} · {{ mode }}</p>
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
          class="px-6 py-5 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-slate-800"
        >{{ output }}</pre>
        <div
          v-else
          class="h-full flex items-center justify-center text-slate-400 text-sm"
        >
          Output will appear here…
        </div>

        <div
          v-if="error"
          class="sticky bottom-3 mx-3 text-xs px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200"
        >
          {{ error }}
        </div>
      </div>
    </section>
  </div>
</template>
