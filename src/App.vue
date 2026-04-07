<script setup>
import { ref, computed, watch } from 'vue'
import { format } from './formatters.js'

const language = ref('json')
const mode = ref('beautify')
const input = ref(`{"merge_config":{"rule_1":{"type":"join","left":423,"join_config":{"join_1":{"right":"file_2","on":[2,3,5,3],"how":true}}}}}`)
const error = ref('')

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
  navigator.clipboard.writeText(output.value)
}
function clearAll() {
  input.value = ''
}
</script>

<template>
  <div class="min-h-screen w-full flex items-center justify-center p-6">
    <div class="w-full max-w-6xl">
      <header class="mb-6 text-center">
        <h1 class="text-3xl font-bold text-brand-dark tracking-tight">
          Code Formatter
        </h1>
        <p class="text-indigo-900/70 mt-1 text-sm">
          Minify or beautify JSON, XML and JavaScript — instantly.
        </p>
      </header>

      <div class="flex flex-wrap items-center justify-center gap-3 mb-5">
        <div class="inline-flex rounded-xl bg-white/70 backdrop-blur p-1 shadow-sm">
          <button
            v-for="l in languages"
            :key="l.id"
            @click="language = l.id"
            class="px-4 py-1.5 text-sm font-medium rounded-lg transition"
            :class="language === l.id
              ? 'bg-indigo-600 text-white shadow'
              : 'text-indigo-900/70 hover:text-indigo-900'"
          >
            {{ l.label }}
          </button>
        </div>

        <div class="inline-flex rounded-xl bg-white/70 backdrop-blur p-1 shadow-sm">
          <button
            @click="mode = 'beautify'"
            class="px-4 py-1.5 text-sm font-medium rounded-lg transition"
            :class="mode === 'beautify'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-indigo-900/70 hover:text-indigo-900'"
          >
            Beautify
          </button>
          <button
            @click="mode = 'minify'"
            class="px-4 py-1.5 text-sm font-medium rounded-lg transition"
            :class="mode === 'minify'
              ? 'bg-indigo-600 text-white shadow'
              : 'text-indigo-900/70 hover:text-indigo-900'"
          >
            Minify
          </button>
        </div>
      </div>

      <div class="grid md:grid-cols-2 gap-5">
        <!-- Input panel (dark, like the screenshot) -->
        <section class="rounded-2xl shadow-2xl bg-brand-dark text-indigo-100 overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <h2 class="font-semibold tracking-wide">Input</h2>
            <button
              @click="clearAll"
              class="text-xs text-indigo-300 hover:text-white transition"
            >
              Clear
            </button>
          </div>
          <textarea
            v-model="input"
            spellcheck="false"
            class="w-full h-[28rem] bg-transparent p-5 font-mono text-sm leading-relaxed resize-none focus:outline-none placeholder-indigo-400/40"
            placeholder="Paste your JSON, XML or JavaScript here…"
          ></textarea>
        </section>

        <!-- Output panel (light, like the screenshot) -->
        <section class="rounded-2xl shadow-2xl bg-white/90 backdrop-blur overflow-hidden">
          <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200">
            <h2 class="font-semibold text-brand-dark tracking-wide">Output</h2>
            <button
              @click="copyOutput"
              class="text-xs px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              Copy
            </button>
          </div>
          <div class="relative">
            <pre
              class="w-full h-[28rem] p-5 font-mono text-sm leading-relaxed overflow-auto whitespace-pre-wrap break-words text-slate-800"
            >{{ output }}</pre>
            <div
              v-if="error"
              class="absolute bottom-3 left-3 right-3 text-xs px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200"
            >
              {{ error }}
            </div>
          </div>
        </section>
      </div>

      <footer class="text-center text-xs text-indigo-900/60 mt-6">
        Built with Vue 3 + Tailwind CSS
      </footer>
    </div>
  </div>
</template>
