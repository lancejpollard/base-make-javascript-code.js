
const Base = require('@lancejpollard/link-base.js')

const base = new Base

if (typeof window !== 'undefined') {
  window.base = base
}
