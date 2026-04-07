// Lightweight formatters for JSON, XML and JavaScript.

export function beautifyJSON(input) {
  const obj = JSON.parse(input)
  return JSON.stringify(obj, null, 2)
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

export function beautifyXML(input) {
  const xml = minifyXML(input)
  const PADDING = '  '
  let formatted = ''
  let pad = 0
  xml
    .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
    .split('\n')
    .forEach((node) => {
      if (!node.trim()) return
      let indent = 0
      if (node.match(/^<\/\w/)) {
        pad = Math.max(pad - 1, 0)
      } else if (node.match(/^<\w[^>]*[^\/]>.*$/) && !node.match(/<\/\w/)) {
        indent = 1
      }
      formatted += PADDING.repeat(pad) + node + '\n'
      pad += indent
    })
  return formatted.trim()
}

// Very small JS minifier — strips comments and collapses whitespace.
// Not a full parser; good enough for snippets.
export function minifyJS(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};,:()\[\]=+\-*/<>!?|&])\s*/g, '$1')
    .trim()
}

// Tiny JS beautifier based on brace/semicolon structure.
export function beautifyJS(input) {
  const src = minifyJS(input)
  let out = ''
  let indent = 0
  const pad = () => '  '.repeat(indent)
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
      indent++
      out += '{\n' + pad()
    } else if (ch === '}') {
      indent = Math.max(indent - 1, 0)
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

export function format(language, mode, input) {
  if (!input.trim()) return ''
  if (language === 'json') return mode === 'minify' ? minifyJSON(input) : beautifyJSON(input)
  if (language === 'xml') return mode === 'minify' ? minifyXML(input) : beautifyXML(input)
  if (language === 'js') return mode === 'minify' ? minifyJS(input) : beautifyJS(input)
  return input
}
