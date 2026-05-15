// Lightweight formatters for JSON, XML, JavaScript and HTML.

export type Language = 'json' | 'xml' | 'js' | 'html'
export type Mode = 'beautify' | 'minify'
export type Indent = number | string // number of spaces, or 'tab'

function resolveIndent(indent: Indent): string {
  if (indent === 'tab' || indent === '\t') return '\t'
  const n = Number(indent)
  return ' '.repeat(Number.isFinite(n) && n > 0 ? n : 2)
}

export function beautifyJSON(input: string, indent: Indent = 2): string {
  const obj = JSON.parse(input)
  return JSON.stringify(obj, null, resolveIndent(indent))
}

export function minifyJSON(input: string): string {
  const obj = JSON.parse(input)
  return JSON.stringify(obj)
}

export function minifyXML(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function beautifyXML(input: string, indent: Indent = 2): string {
  const xml = minifyXML(input)
  const PADDING = resolveIndent(indent)
  let formatted = ''
  let pad = 0
  xml
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .forEach((node) => {
      if (!node.trim()) return
      let add = 0
      if (node.match(/^<\/\w/)) {
        pad = Math.max(pad - 1, 0)
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/) && !node.match(/<\/\w/)) {
        add = 1
      }
      formatted += PADDING.repeat(pad) + node + '\n'
      pad += add
    })
  return formatted.trim()
}

const HTML_VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'meta', 'param', 'source', 'track', 'wbr',
])

const HTML_INLINE_PRESERVE = new Set(['pre', 'textarea', 'script', 'style'])

export function minifyHTML(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function beautifyHTML(input: string, indent: Indent = 2): string {
  const html = minifyHTML(input)
  const PADDING = resolveIndent(indent)
  let formatted = ''
  let pad = 0
  html
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .forEach((node) => {
      if (!node.trim()) return
      const tagMatch = node.match(/^<\/?([\w-]+)/)
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : ''
      const isClosing = /^<\//.test(node)
      const isDoctypeOrPI = /^<[!?]/.test(node)
      const isSelfClosing = /\/>$/.test(node)
      const isVoid = HTML_VOID_ELEMENTS.has(tagName)
      const isInlinePreserve = HTML_INLINE_PRESERVE.has(tagName)

      let add = 0
      if (isClosing) {
        pad = Math.max(pad - 1, 0)
      } else if (
        !isSelfClosing &&
        !isVoid &&
        !isDoctypeOrPI &&
        /^<\w/.test(node) &&
        !(isInlinePreserve && /<\/\w/.test(node))
      ) {
        add = 1
      }
      formatted += PADDING.repeat(pad) + node + '\n'
      pad += add
    })
  return formatted.trim()
}

export function minifyJS(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,:()\[\]=+\-*/<>!?|&])\s*/g, '$1')
    .trim()
}

export function beautifyJS(input: string, indent: Indent = 2): string {
  const src = minifyJS(input)
  const PAD = resolveIndent(indent)
  let out = ''
  let depth = 0
  const pad = (): string => PAD.repeat(depth)
  let inString = false
  let stringCh = ''
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inString) {
      out += ch
      if (ch === stringCh && src[i - 1] !== '\\') inString = false
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true
      stringCh = ch
      out += ch
      continue
    }
    if (ch === '{') {
      depth++
      out += '{\n' + pad()
    } else if (ch === '}') {
      depth = Math.max(depth - 1, 0)
      out = out.replace(/\s+$/, '')
      out += '\n' + pad() + '}'
    } else if (ch === ';') {
      out += ';\n' + pad()
    } else {
      out += ch
    }
  }
  return out.replace(/\n\s*\n/g, '\n').trim()
}

export function format(
  language: Language,
  mode: Mode,
  input: string,
  indent: Indent = 2
): string {
  if (!input.trim()) return ''
  if (language === 'json')
    return mode === 'minify' ? minifyJSON(input) : beautifyJSON(input, indent)
  if (language === 'xml')
    return mode === 'minify' ? minifyXML(input) : beautifyXML(input, indent)
  if (language === 'js')
    return mode === 'minify' ? minifyJS(input) : beautifyJS(input, indent)
  if (language === 'html')
    return mode === 'minify' ? minifyHTML(input) : beautifyHTML(input, indent)
  return input
}
