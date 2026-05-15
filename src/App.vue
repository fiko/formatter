<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { format, type Language, type Mode, type Indent } from './formatters'
import JsonTree from './components/JsonTree.vue'
import XmlTree from './components/XmlTree.vue'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'
import javascript from 'highlight.js/lib/languages/javascript'
import lightTheme from 'highlight.js/styles/atom-one-light.css?raw'
import darkTheme from 'highlight.js/styles/atom-one-dark.css?raw'

hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('javascript', javascript)

// Theme handling — initial value matches localStorage > system preference
type Theme = 'light' | 'dark'
const theme = ref<Theme>('light')
function applyTheme(t: Theme): void {
  theme.value = t
  const root = document.documentElement
  if (t === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  let styleEl = document.getElementById('hljs-theme') as HTMLStyleElement | null
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'hljs-theme'
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = t === 'dark' ? darkTheme : lightTheme
  localStorage.setItem('theme', t)
}
function toggleTheme(): void {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}
// Mobile detection
const isMobile = ref(false)
let mqlTheme: MediaQueryList | null = null
onMounted(() => {
  mqlTheme = window.matchMedia('(max-width: 767px)')
  isMobile.value = mqlTheme.matches
  mqlTheme.addEventListener('change', (e: MediaQueryListEvent) => (isMobile.value = e.matches))
})
onUnmounted(() => {
  if (mqlTheme) mqlTheme.onchange = null
})

const outputStyle = computed(() =>
  isMobile.value ? {} : { left: outputLeftPct.value + '%' }
)
const editorStyle = computed(() =>
  isMobile.value ? {} : { width: outputLeftPct.value + 'vw' }
)

onMounted(() => {
  const stored = localStorage.getItem('theme') as Theme | null
  const prefersDark =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(stored ?? (prefersDark ? 'dark' : 'light'))
})

// Parse URL path → { mode, language }
// Supported: /, /json, /xml, /javascript, /minify, /minify/json, /minify/xml, /minify/javascript

type ParsedPath = { mode: Mode; language: Language; notFound: boolean }
const SLUG_TO_LANG: Record<string, Language> = { json: 'json', xml: 'xml', javascript: 'js', js: 'js', html: 'html' }

function parsePath(pathname: string): ParsedPath {
  const parts = pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  if (parts.length === 0) return { mode: 'beautify', language: 'json', notFound: false }

  let m: Mode = 'beautify'
  let rest = parts

  if (parts[0] === 'minify' || parts[0] === 'beautify') {
    m = parts[0] as Mode
    rest = parts.slice(1)
    if (rest.length === 0) {
      return { mode: m, language: 'json', notFound: false }
    }
  }

  if (rest.length !== 1 || !(rest[0] in SLUG_TO_LANG)) {
    return { mode: 'beautify', language: 'json', notFound: true }
  }
  return { mode: m, language: SLUG_TO_LANG[rest[0]], notFound: false }
}

const initial: ParsedPath =
  typeof window !== 'undefined'
    ? parsePath(window.location.pathname)
    : { mode: 'beautify', language: 'json', notFound: false }
const notFound = ref(initial.notFound)

const language = ref<Language>(initial.language)
const mode = ref<Mode>(initial.mode)
const indent = ref<Indent>('2')

// Keep URL in sync when user changes language/mode
const LANG_TO_SLUG: Record<Language, string> = {
  json: 'json',
  xml: 'xml',
  js: 'javascript',
  html: 'html',
}
function syncUrl(): void {
  if (typeof window === 'undefined' || notFound.value) return
  const langSlug = LANG_TO_SLUG[language.value]
  const path =
    mode.value === 'minify' ? `/minify/${langSlug}` : `/${langSlug}`
  if (window.location.pathname !== path) {
    window.history.replaceState(null, '', path)
  }
}
watch([language, mode], syncUrl)

function goHome(): void {
  notFound.value = false
  language.value = 'json'
  mode.value = 'beautify'
  window.history.replaceState(null, '', '/')
}
const input = ref('')
const SAMPLES: Record<Language, string> = {
  json: `{"Name":"John Doe","Sample":"Paste your JSON, XML or JavaScript here..."}`,
  xml: `<?xml version="1.0"?><user><name>John Doe</name><sample>Paste your JSON, XML or JavaScript here...</sample></user>`,
  js: `function greet(name){const msg="Hello, "+name+"!";console.log(msg);return msg;}greet("John Doe");`,
  html: `<!DOCTYPE html><html><head><title>Hello</title></head><body><h1>Hi, John Doe</h1><p>Paste your HTML here...</p><br><img src="x.png" alt="x"></body></html>`,
}
function useSample(): void {
  input.value = SAMPLES[language.value] || SAMPLES.json
}
const error = ref('')

const hasInput = computed(() => input.value.trim().length > 0)

// Output card horizontal position (percentage from left of viewport).
// 75% → output occupies right 25% of screen; 50% → output occupies right 50%.
const outputLeftPct = ref<number>(input.value.trim().length > 0 ? 50 : 75)
const userResized = ref(false)
const isResizing = ref(false)
watch(hasInput, (val) => {
  if (userResized.value) return
  outputLeftPct.value = val ? 50 : 75
})

function startResize(e: MouseEvent | TouchEvent): void {
  e.preventDefault()
  userResized.value = true
  isResizing.value = true
  const onMove = (ev: MouseEvent | TouchEvent): void => {
    const x = 'touches' in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX
    const pct = (x / window.innerWidth) * 100
    outputLeftPct.value = Math.min(85, Math.max(15, pct))
  }
  const onUp = (): void => {
    isResizing.value = false
    window.removeEventListener('mousemove', onMove as EventListener)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchmove', onMove as EventListener)
    window.removeEventListener('touchend', onUp)
  }
  window.addEventListener('mousemove', onMove as EventListener)
  window.addEventListener('mouseup', onUp)
  window.addEventListener('touchmove', onMove as EventListener)
  window.addEventListener('touchend', onUp)
}

const output = computed(() => {
  try {
    error.value = ''
    return format(language.value, mode.value, input.value, indent.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
    return ''
  }
})

const hljsLang = computed(() => {
  if (language.value === 'js') return 'javascript'
  if (language.value === 'html') return 'xml'
  return language.value
})

const inputLineItems = computed(() =>
  (input.value.length ? input.value : ' ').split('\n')
)

// Measured top offsets for each logical line (for soft-wrap gutter).
type LinePos = { n: number; top: number }
const inputLinePositions = ref<LinePos[]>([])
const mirror = ref<HTMLDivElement | null>(null)
const mirrorWidth = ref<string>('100%')
const mirrorHeight = ref<string>('auto')

async function measureLines(): Promise<void> {
  await nextTick()
  if (!mirror.value || !inputArea.value) return
  // Match mirror width to textarea's inner content width
  const ta = inputArea.value
  const cs = getComputedStyle(ta)
  const innerW =
    ta.clientWidth -
    parseFloat(cs.paddingLeft) -
    parseFloat(cs.paddingRight)
  mirrorWidth.value =
    innerW +
    parseFloat(cs.paddingLeft) +
    parseFloat(cs.paddingRight) +
    'px'
  await nextTick()
  const nodes = mirror.value.querySelectorAll<HTMLElement>('[data-ln]')
  const base = mirror.value.getBoundingClientRect().top
  inputLinePositions.value = Array.from(nodes).map((el) => ({
    n: Number(el.dataset.ln),
    top: el.getBoundingClientRect().top - base,
  }))
  mirrorHeight.value = mirror.value.scrollHeight + 'px'
}
watch(input, measureLines, { flush: 'post' })
onMounted(() => {
  measureLines()
  if (typeof ResizeObserver !== 'undefined' && inputArea.value) {
    const ro = new ResizeObserver(() => measureLines())
    ro.observe(inputArea.value)
  }
})

const outputHighlighted = computed(() => {
  if (!output.value) return ''
  const html = hljs.highlight(output.value, { language: hljsLang.value }).value
  return html
    .split('\n')
    .map(
      (line, i) =>
        `<span class="output-line"><span class="output-ln">${i + 1}</span><span class="output-code">${line || ' '}</span></span>`
    )
    .join('')
})

const languages: { id: Language; label: string }[] = [
  { id: 'json', label: 'JSON' },
  { id: 'xml', label: 'XML' },
  { id: 'js', label: 'JavaScript' },
]
const moreLanguages: { id: Language; label: string }[] = [
  { id: 'html', label: 'HTML' },
]
const moreOpen = ref(false)
const isMoreLang = computed(() =>
  moreLanguages.some((l) => l.id === language.value)
)
function pickMoreLanguage(id: Language): void {
  language.value = id
  moreOpen.value = false
}
function onDocClick(e: MouseEvent): void {
  const t = e.target as HTMLElement | null
  if (!t) return
  if (!t.closest('[data-more-menu]')) moreOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

const inputArea = ref<HTMLTextAreaElement | null>(null)
const inputGutter = ref<HTMLDivElement | null>(null)
function onInputScroll(): void {
  if (inputGutter.value && inputArea.value) {
    inputGutter.value.scrollTop = inputArea.value.scrollTop
  }
}

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null
function copyOutput(): void {
  if (!output.value) return
  navigator.clipboard.writeText(output.value)
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 1500)
}
function clearAll(): void {
  input.value = ''
}
</script>

<template>
  <!-- 404 page -->
  <div
    v-if="notFound"
    class="h-screen w-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-indigo-200 to-indigo-400 dark:from-brand-dark dark:to-indigo-950 text-brand-dark dark:text-indigo-100"
  >
    <div class="font-mono text-[8rem] leading-none font-bold text-indigo-600 dark:text-indigo-400 drop-shadow-sm">
      404
    </div>
    <h1 class="mt-4 text-2xl md:text-3xl font-bold">Page not found</h1>
    <p class="mt-2 max-w-md text-sm md:text-base text-indigo-900/70 dark:text-indigo-200/70">
      The URL you're looking for doesn't exist. Try one of the valid formatter routes below.
    </p>
    <div class="mt-6 font-mono text-xs md:text-sm flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-indigo-900/80 dark:text-indigo-200/80">
      <a href="/" class="underline hover:text-indigo-600 dark:hover:text-white transition">/json</a>
      <span>·</span>
      <a href="/xml" class="underline hover:text-indigo-600 dark:hover:text-white transition">/xml</a>
      <span>·</span>
      <a href="/javascript" class="underline hover:text-indigo-600 dark:hover:text-white transition">/javascript</a>
      <span class="mx-1">|</span>
      <a href="/minify" class="underline hover:text-indigo-600 dark:hover:text-white transition">/minify</a>
      <span>·</span>
      <a href="/minify/xml" class="underline hover:text-indigo-600 dark:hover:text-white transition">/minify/xml</a>
      <span>·</span>
      <a href="/minify/javascript" class="underline hover:text-indigo-600 dark:hover:text-white transition">/minify/javascript</a>
    </div>
    <button
      @click="goHome"
      class="mt-8 px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-lg transition"
    >
      Back to Formatter
    </button>
  </div>

  <div v-else class="h-screen w-screen flex overflow-hidden relative">
    <!-- INPUT PANE -->
    <section
      class="relative flex flex-col bg-indigo-200 text-indigo-900 dark:bg-brand-dark dark:text-indigo-100 w-full h-full"
    >
      <!-- Sticky header -->
      <header class="sticky top-0 z-20 px-6 py-4 bg-indigo-200/95 dark:bg-brand-dark/95 backdrop-blur border-b border-indigo-300/50 dark:border-white/10 flex items-center justify-between">
        <div>
          <h1 class="text-lg font-bold tracking-tight flex items-center gap-2">
            Code Formatter
            <span class="text-indigo-500 dark:text-indigo-400 font-normal">(by Fiko)</span>
            <a
              href="https://github.com/fiko/formatter"
              target="_blank"
              rel="noopener noreferrer"
              class="text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white transition"
              title="View on GitHub"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.07 11.07 0 015.79 0c2.21-1.49 3.18-1.18 3.18-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.73 18.27.5 12 .5z"/></svg>
            </a>
          </h1>
          <p class="text-xs text-indigo-700/70 dark:text-indigo-300/70">JSON · XML · JavaScript · more…</p>
        </div>
        <button
          @click="clearAll"
          class="text-xs text-indigo-700 hover:text-indigo-900 dark:text-indigo-300 dark:hover:text-white transition"
        >
          Clear
        </button>
      </header>

      <!-- Editor area: gutter + textarea -->
      <div
        class="flex-1 flex overflow-hidden relative w-full"
        :class="isResizing ? '' : 'transition-[width] duration-500 ease-in-out'"
        :style="editorStyle"
      >
        <div
          ref="inputGutter"
          class="w-12 shrink-0 overflow-hidden bg-indigo-300/40 dark:bg-black/20 text-right font-mono text-xs leading-relaxed text-indigo-600/70 dark:text-indigo-400/50 select-none relative"
        >
          <div class="relative pt-5 pb-32" :style="{ height: mirrorHeight }">
            <div
              v-for="item in inputLinePositions"
              :key="item.n"
              class="absolute left-0 right-0 px-2"
              :style="{ top: item.top + 'px' }"
            >
              {{ item.n }}
            </div>
          </div>
        </div>
        <button
          v-if="!hasInput"
          @click="useSample"
          class="absolute top-[20%] left-1/2 -translate-x-1/2 z-10 px-5 py-2.5 rounded-full bg-indigo-500 text-white text-sm font-medium shadow-lg hover:bg-indigo-600 transition"
        >
          Try Sample Code
        </button>
        <textarea
          ref="inputArea"
          v-model="input"
          @scroll="onInputScroll"
          spellcheck="false"
          class="flex-1 bg-transparent pl-3 pr-6 py-5 pb-32 font-mono text-xs leading-relaxed resize-none focus:outline-none placeholder-indigo-500/50 dark:placeholder-indigo-400/40 overflow-auto"
          placeholder="Paste your JSON, XML or JavaScript here…"
        ></textarea>

        <!-- Hidden mirror used to measure where each logical line lives -->
        <div
          ref="mirror"
          aria-hidden="true"
          class="absolute top-0 left-12 pointer-events-none invisible font-mono text-xs leading-relaxed pl-3 pr-6 py-5 pb-32"
          :style="{ width: mirrorWidth, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }"
        >
          <div v-for="(line, i) in inputLineItems" :key="i" :data-ln="i + 1">{{ line || ' ' }}</div>
        </div>
      </div>

      <!-- Sticky footer with gradient -->
      <footer
        class="absolute bottom-0 left-0 z-40 pl-20 pr-6 pt-12 pb-5 md:bg-gradient-to-t md:from-indigo-200 md:via-indigo-200/95 md:to-transparent md:dark:from-brand-dark md:dark:via-brand-dark/95 md:dark:to-transparent pointer-events-none"
        :style="editorStyle"
      >
        <div class="flex flex-wrap items-center gap-2 pointer-events-auto">
          <div class="inline-flex rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur p-1">
            <button
              v-for="l in languages"
              :key="l.id"
              @click="language = l.id"
              class="px-3 py-1 text-xs font-medium rounded-md transition"
              :class="language === l.id
                ? 'bg-indigo-500 text-white shadow'
                : 'text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-white'"
            >
              {{ l.label }}
            </button>
            <div class="relative inline-flex" data-more-menu>
              <button
                @click="moreOpen = !moreOpen"
                class="px-3 py-1 text-xs font-medium rounded-md transition"
                :class="isMoreLang || moreOpen
                  ? 'bg-indigo-500 text-white shadow'
                  : 'text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-white'"
                :title="isMoreLang ? moreLanguages.find(l => l.id === language)?.label : 'More'"
                aria-haspopup="menu"
                :aria-expanded="moreOpen"
              >
                ···
              </button>
              <div
                v-if="moreOpen"
                class="absolute bottom-full mb-2 left-0 z-50 min-w-[8rem] rounded-lg bg-white dark:bg-[#282c34] shadow-xl ring-1 ring-black/10 dark:ring-white/15 py-1"
                role="menu"
              >
                <div class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">More</div>
                <button
                  v-for="l in moreLanguages"
                  :key="l.id"
                  @click="pickMoreLanguage(l.id)"
                  class="w-full text-left px-3 py-1.5 text-xs font-medium transition"
                  :class="language === l.id
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-700 hover:bg-indigo-50 dark:text-slate-200 dark:hover:bg-white/5'"
                  role="menuitem"
                >
                  {{ l.label }}
                </button>
              </div>
            </div>
          </div>
          <div class="inline-flex rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur p-1">
            <button
              @click="mode = 'beautify'"
              class="px-3 py-1 text-xs font-medium rounded-md transition"
              :class="mode === 'beautify'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-white'"
            >
              Beautify
            </button>
            <button
              @click="mode = 'minify'"
              class="px-3 py-1 text-xs font-medium rounded-md transition"
              :class="mode === 'minify'
                ? 'bg-indigo-500 text-white shadow'
                : 'text-indigo-700 hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-white'"
            >
              Minify
            </button>
          </div>
        </div>
      </footer>
    </section>

    <!-- OUTPUT PANE — floats over input with rounded corners -->
    <section
      class="absolute z-30 flex flex-col bg-white dark:bg-[#282c34] rounded-3xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 overflow-hidden top-[55%] left-2 right-2 bottom-2 md:top-4 md:bottom-4 md:right-4 md:left-auto"
      :class="isResizing ? '' : 'transition-[left] duration-500 ease-in-out'"
      :style="outputStyle"
    >
      <!-- Drag handle to resize -->
      <div
        @mousedown="startResize"
        @touchstart="startResize"
        class="hidden md:block absolute top-0 left-0 h-full w-2 cursor-col-resize z-20 group"
      >
        <div class="absolute top-1/2 -translate-y-1/2 left-0 w-1 h-12 rounded-full bg-slate-300 dark:bg-white/20 group-hover:bg-indigo-500 transition" />
      </div>
      <header class="sticky top-0 z-10 px-6 py-4 bg-white/95 dark:bg-[#282c34]/95 backdrop-blur border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-brand-dark dark:text-white tracking-tight">Output</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400 capitalize">{{ language }} · {{ mode }}</p>
        </div>
        <div class="flex items-center gap-2">
          <label
            v-if="mode === 'beautify'"
            class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
          >
            <select
              v-model="indent"
              class="text-xs rounded-md px-2 py-1 bg-white dark:bg-white/10 border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="2">2 tab space</option>
              <option value="4">4 tab space</option>
              <option value="8">8 tab space</option>
            </select>
          </label>
          <button
            @click="copyOutput"
            :disabled="!output"
            class="text-xs px-3 py-1.5 rounded-md text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
            :class="copied ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'"
          >
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>
      </header>

      <div class="flex-1 overflow-hidden relative flex flex-col">
        <!-- JSON beautify → interactive collapsible tree -->
        <JsonTree
          v-if="output && language === 'json' && mode === 'beautify'"
          :value="output"
          :indent="indent"
          class="flex-1"
        />

        <!-- XML beautify → interactive collapsible tree -->
        <XmlTree
          v-else-if="output && language === 'xml' && mode === 'beautify'"
          :value="output"
          :indent="indent"
          class="flex-1"
        />

        <!-- JS or minified → highlighted text with gutter -->
        <div v-else-if="output" class="flex-1 flex overflow-hidden relative">
          <div class="sticky left-0 w-12 shrink-0 bg-slate-100 dark:bg-[#1e2028] z-10 self-stretch" />
          <pre
            class="hljs flex-1 pr-4 py-5 font-mono text-xs leading-relaxed !bg-transparent overflow-auto -ml-12"
          ><code v-html="outputHighlighted"></code></pre>
        </div>

        <!-- Empty state -->
        <div
          v-else
          class="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm"
        >
          Output will appear here…
        </div>

        <div
          v-if="error"
          class="absolute bottom-3 left-3 right-3 text-xs px-3 py-2 rounded-md bg-red-900/40 text-red-200 border border-red-700/50"
        >
          {{ error }}
        </div>
      </div>
    </section>

    <!-- Theme toggle (bottom-left) -->
    <button
      @click="toggleTheme"
      class="fixed bottom-4 left-4 z-40 w-10 h-10 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur shadow-lg ring-1 ring-black/5 dark:ring-white/20 flex items-center justify-center text-brand-dark dark:text-yellow-300 hover:scale-105 transition"
      :title="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
    >
      <svg v-if="theme === 'dark'" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
    </button>
  </div>
</template>
