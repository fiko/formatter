// Lightweight formatters for JSON, XML and JavaScript.

function resolveIndent(indent) {
  if (indent === 'tab' || indent === '\t') return '\t'
  const n = Number(indent)
  return ' '.repeat(Number.isFinite(n) && n > 0 ? n : 2)
}

export function beautifyJSON(input, indent = 2) {
  const obj = JSON.parse(input)
  return JSON.stringify(obj, null, resolveIndent(indent))
}

export function minifyJSON(input) {
  const obj = JSON.parse(input)
  return JSON.stringify(obj)
}

export function minifyXML(input) {
  return input
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function beautifyXML(input, indent = 2) {
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

export function minifyJS(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,:()\[\]=+\-*/<>!?|&])\s*/g, '$1')
    .trim()
}

export function beautifyJS(input, indent = 2) {
  const src = minifyJS(input)
  const PAD = resolveIndent(indent)
  let out = ''
  let depth = 0
  const pad = () => PAD.repeat(depth)
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

export function format(language, mode, input, indent = 2) {
  if (!input.trim()) return ''
  if (language === 'json')
    return mode === 'minify' ? minifyJSON(input) : beautifyJSON(input, indent)
  if (language === 'xml')
    return mode === 'minify' ? minifyXML(input) : beautifyXML(input, indent)
  if (language === 'js')
    return mode === 'minify' ? minifyJS(input) : beautifyJS(input, indent)
  return input
}
