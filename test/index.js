
const fs = require('fs')
const load = require('@lancejpollard/load-link-deck.js')
const generateJS = require('..')

const deck = load('./test/config.json')
const js = generateJS(deck)
console.log('--- result ---')
console.log(js)
fs.writeFileSync(`tmp/out.js`, js)
