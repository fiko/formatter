import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

// Strip everything between <!--SEO_START--> and <!--SEO_END--> unless
// ENABLE_SEO is explicitly set to "true". Default = disabled.
function seoToggle(enabled) {
  return {
    name: 'seo-toggle',
    transformIndexHtml(html) {
      if (enabled) return html
      return html.replace(/<!--SEO_START-->[\s\S]*?<!--SEO_END-->/g, '')
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const seoEnabled = env.ENABLE_SEO === 'true'
  return {
    plugins: [vue(), seoToggle(seoEnabled)],
  }
})
