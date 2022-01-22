
const transpile = require('./lib/transpile')
const resolve = require('./lib/resolve')
const print = require('./lib/print')

module.exports = make

function make(deck) {
  const compiledDeck = transpile(deck)
  resolve(compiledDeck)
  return print(compiledDeck)
}
