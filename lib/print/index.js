
// print the AST

const fs = require('fs')
const HEAD = fs.readFileSync('./make/head/index.js', 'utf-8')
const pathResolver = require('path')
const PRINT_AST = require('@lancejpollard/normalize-ast.js/print')

module.exports = print

function print(compiledDeck) {
  const program = {
    type: 'Program',
    body: []
  }

  Object.keys(compiledDeck.files).forEach(path => {
    const compiledFile = compiledDeck.files[path]
    // const program = { type: 'Program', body: (compiledFile.output ?? {}).task || [] }
    // console.log(PRINT_AST(program))
    if (compiledFile.bound)
      program.body.push(compiledFile.bound)
  })

  console.log(HEAD + '\n' + PRINT_AST(program))
}
