
const transpile = require('./lib/transpile')
const resolve = require('./lib/resolve')
const print = require('./lib/print')

function make(file, deck) {
  const compiledDeck = transpile(file, deck)
  resolve(compiledDeck)
  print(compiledDeck)
}

module.exports = make
