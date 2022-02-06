
const fs = require('fs')
const HEAD = fs.readFileSync(`${__dirname}/lib/head/index.js`, 'utf-8')
const PRINT_AST = require('@lancejpollard/normalize-ast.js/print')
const AST = require('@lancejpollard/normalize-ast.js/create')
const pathResolver = require('path')

module.exports = make

function make(deck) {
  const compiledDeck = transpile(deck)
  return print(compiledDeck)
}

// PRINT_AST({
//   type: 'Program',
//   body: [
//     {
//       "type": "FunctionDeclaration",
//       "id": null,
//       "params": [
//         {
//           "type": "Identifier",
//           "name": "array"
//         }
//       ],
//       "body": {
//         "type": "BlockStatement",
//         "body": [
//           {
//             "type": "ReturnStatement",
//             "argument": {
//               "type": "CallExpression",
//               "callee": {
//                 "type": "MemberExpression",
//                 "object": {
//                   "type": "Identifier",
//                   "name": "Promise"
//                 },
//                 "property": {
//                   "type": "Identifier",
//                   "name": "all"
//                 },
//                 "computed": false
//               },
//               "arguments": [
//                 {
//                   "type": "Identifier",
//                   "name": "array"
//                 }
//               ]
//             }
//           }
//         ]
//       },
//       "async": false,
//       "generator": false
//     }
//   ]
// })

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

  fs.writeFileSync('tmp/debug.json', JSON.stringify(program, null, 2))

  return HEAD + '\n' + PRINT_AST(program)
}

function makeBaseBindExpression(road, bind) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('base'),
      AST.createIdentifier('bind'),
    ),
    [AST.createLiteral(road), bind]
  )
}

function makeSave(file, zone) {
  const left = zone.nest.form === 'nest' ? makeNest(file, zone.nest) : makeLink(file, zone.nest)
  const right = makeSift(file, zone.sift)
  return AST.createAssignmentExpression(left, right)
}

function makeHost(file, zone) {
  const left = AST.createIdentifier(zone.name)
  const right = zone.sift && makeSift(file, zone.sift)
  return AST.createVariable(
    'let',
    left,
    right
  )
}

function makeTurn(file, zone) {
  const argument = makeSift(file, zone.sift)
  return AST.createReturnStatement(argument)
}

function makeCall(file, call) {
  const wait = !!call.wait
  const args = []

  call.bind.forEach(b => {
    const arg = b.sift.form === 'task'
      ? makeTask(file, b.sift)
      : makeSift(file, b.sift)
    args.push(arg)
  })

  call.hook.forEach(h => {
    const params = []
    h.base.forEach(b => {
      params.push(AST.createIdentifier(b.name))
    })
    const body = []
    h.zone.forEach(zone => {
      switch (zone.form) {
        case `host`:
          body.push(makeHost(file, zone))
          break
        case `save`:
          body.push(makeSave(file, zone))
          break
        case `turn`:
          body.push(makeTurn(file, zone))
          break
        case `call`:
          body.push(makeCall(file, zone))
          break
      }
    })

    const fxnAST = AST.createFunctionDeclaration(null, params, body)
    args.push(fxnAST)
  })

  return AST.createCallExpression(
    AST.createIdentifier(call.name),
    args,
    { await: wait }
  )
}

function makeSift(file, sift) {
  switch (sift.form) {
    case `sift-text`: return AST.createLiteral(sift.text)
    case `text`: return AST.createLiteral(sift.text)
    case `size`: return AST.createLiteral(sift.size)
    case `link`: return makeLink(file, sift.link)
    case `call`: return makeCall(file, sift)
  }
}

function makeLink(file, link) {
  if (link.form === 'host') {
    return AST.createIdentifier(link.name)
  } else {
    return makeNest(link)
  }
}

function makeNest(node) {
  if (node.form == 'site') {
    return {
      type: 'Identifier',
      name: node.name,
    };
  } else {
    const [base, ...props] = node.link;
    return props.reduce((lhs, rhs) => ({
      type: 'MemberExpression',
      object: lhs,
      property: makeNest(rhs),
      computed: rhs.form == 'nest',
    }), makeNest(base));
  }
}

function makeDockTaskFile(file) {
  file.output = {}
  file.output.task = []
  file.hostFile.task.forEach(task => {
    file.output.task.push(makeDockTask(file, task))
  })
  file.output.call = []
  file.hostFile.call.forEach(call => {
    if (call.form === 'save') {
      file.output.call.push(makeSave(file, call))
    } else {
      file.output.call.push(makeCall(file, call))
    }
  })
  console.log('make dock')
  file.bound = makeBaseBindExpression(
    file.hostFile.road,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      ...file.output.call,
      ...file.output.task.map((task, i) => makeFileTask(file.hostFile.task[i].name, task)),
    ]))
  )
}

function makeFileTask(name, task) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('task'),
    ),
    [
      AST.createLiteral(name),
      task
    ]
  )
}

function makeTurn(file, zone) {
  const argument = makeSift(file, zone.sift)
  return AST.createReturnStatement(argument)
}

function makeSift(file, sift) {
  switch (sift.form) {
    case `sift-text`: return AST.createLiteral(sift.text)
    case `text`: return AST.createLiteral(sift.text)
    case `size`: return AST.createLiteral(sift.size)
    case `link`: return makeLink(file, sift.link)
    case `call`: return makeDockCall(file, sift)
  }
}

/**
 * This is a native JavaScript function.
 */

function makeDockTask(file, task) {
  const params = []
  const wait = !!task.wait
  task.base.forEach(base => {
    params.push(AST.createIdentifier(base.name))
  })

  const body = []

  task.zone.forEach(zone => {
    switch (zone.form) {
      case `host`:
        body.push(makeHost(file, zone))
        break
      case `save`:
        body.push(makeSave(file, zone))
        break
      case `turn`:
        body.push(makeTurn(file, zone))
        break
      case `call`:
        body.push(makeDockCall(file, zone))
        break
    }
  })

  const fxnAST = AST.createFunctionDeclaration(
    null,
    params,
    AST.createBlockStatement(body),
    { async: wait }
  )
  return fxnAST
}

const transforms = {
  make: makeDockCallMake,
  test: makeDockCallTest,
  look: makeDockCallLook,
  'call-base': makeDockCallCallBase,
  'call-function':  makeDockCallCallFunction,
  'call-head': makeDockCallUnaryOperation,
  'call-twin': makeDockCallBinaryExpression,
  'call-try': makeDockCallCallTry,
  'test-else': makeDockCallTestElse,
  'loop': makeDockCallLoop,
  'debug': makeDockCallDebug,
  'call-keyword':  makeDockCallKeyword,
  'call-keyword-2':  makeDockCallKeyword2,
  'set-aspect': makeDockCallSetAspect,
  'get-aspect': makeDockCallGetAspect,
  'set-dynamic-aspect': makeDockCallSetDynamicAspect,
  'get-dynamic-aspect': makeDockCallGetDynamicAspect,
  'delete': makeDockCallDelete,
  'create-literal': makeDockCallCreateLiteral,
  'throw-error': makeThrowError,
}

function makeThrowError(call) {
  const factor = call.bind.filter(bind => bind.name === 'factor')[0]
  return AST.createThrowStatement(
    AST.createNewExpression(
      AST.createLiteral('Error'),
      [
        factor.sift.link ? makeLink(null, factor.sift.link) : AST.createLiteral(factor.sift.text)
      ]
    )
  )
}

function makeDockCall(file, call) {
  if (!transforms[call.name]) {
    throw new Error(`Missing implementation of ${call.name}`)
  }
  const base = transforms[call.name](call)
  return base
}

function makeDockCallCreateLiteral(call) {
  const literal = call.bind.filter(bind => bind.name === 'literal')[0]
  return AST.createLiteral(literal.sift.text)
}

function makeDockCallDelete(call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createUnaryExpression(
    AST.createMemberExpression(makeLink(null, object.sift.link), makeLink(null, aspect.sift.link), true),
    'delete',
    true
  )
}

function makeDockCallGetAspect(call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createMemberExpression(makeLink(null, object.sift.link), AST.createIdentifier(aspect.sift.text), true)
}

function makeDockCallSetAspect(call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  const factor = call.bind.filter(bind => bind.name === 'factor')[0]
  return AST.createAssignmentExpression(
    AST.createMemberExpression(makeLink(null, object.sift.link), AST.createIdentifier(aspect.sift.text), true),
    makeLink(null, factor.sift.link)
  )
}

function makeDockCallGetDynamicAspect(call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createMemberExpression(makeLink(null, object.sift.link), makeLink(null, aspect.sift.link), true)
}

function makeDockCallSetDynamicAspect(call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  const factor = call.bind.filter(bind => bind.name === 'factor')[0]
  return AST.createAssignmentExpression(
    AST.createMemberExpression(makeLink(null, object.sift.link), makeLink(null, aspect.sift.link), true),
    makeLink(null, factor.sift.link)
  )
}

function makeDockCallKeyword2(call) {
  const left = call.bind.filter(bind => bind.name === 'left')[0]
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  const right = call.bind.filter(bind => bind.name === 'right')[0]
  return AST.createBinaryExpression(
    makeLink(null, left.sift.link),
    keyword.sift.text,
    makeLink(null, right.sift.link)
  )
}

function makeDockCallKeyword(call) {
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  return AST.createUnaryExpression(
    makeLink(null, value.sift.link),
    keyword.sift.text
  )
}

function makeDockCallDebug(call) {
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  return AST.createDebuggerStatement()
}

function makeDockCallLoop(call) {
  const check = call.bind.filter(bind => bind.name === 'check')[0]
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  return AST.createWhileStatement(
    makeLink(null, check.sift.link),
    [makeLink(null, block.sift.link)]
  )
}

function makeDockCallTestElse(call) {
  const check = call.bind.filter(bind => bind.name === 'check')[0]
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  const other = call.bind.filter(bind => bind.name === 'else')[0]
  return AST.createIfStatement(
    makeLink(null, check.sift.link),
    AST.createBlockStatement([makeLink(null, block.sift.link)]),
    AST.createBlockStatement([makeLink(null, other.sift.link)])
  )
}

function makeDockCallCallTry(call) {
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  const error = call.bind.filter(bind => bind.name === 'error')[0]
  return AST.createTryStatement(
    makeLink(null, block.sift.link),
    makeLink(null, error.sift.link)
  )
}

function makeDockCallUnaryOperation(call) {
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createUpdateExpression(
    makeLink(null, value.sift.link),
    operation.sift.text,
    true
  )
}

function makeDockCallBinaryExpression(call) {
  const left = call.bind.filter(bind => bind.name === 'left')[0]
  const right = call.bind.filter(bind => bind.name === 'right')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createReturnStatement(AST.createBinaryExpression(
    makeLink(null, left.sift.link),
    operation.sift.text,
    right.sift.form === 'sift-text' ? AST.createLiteral(right.sift.text) : makeLink(null, right.sift.link)
  ))
}

function makeDockCallMake(call) {
  const ctor = call.bind[0]
  const factor = call.bind.slice(1)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(null, factor.sift.link))
  })
  return AST.createNewExpression(
    AST.createIdentifier(ctor.sift.text),
    args
  )
}

function makeDockCallCallBase(call, fileScope) {
  const object = call.bind[0]
  const method = call.bind[1]
  const factor = call.bind.slice(2)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(null, factor.sift.link))
  })
  if (object.sift.form === 'link') {
    return AST.createCallExpression(
      AST.createMemberExpression(
        makeLink(null, object.sift.link, fileScope),
        AST.createIdentifier(method.sift.text)
      ),
      args
    )
  }
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier(object.sift.text),
      AST.createIdentifier(method.sift.text)
    ),
    args
  )
}

function makeDockCallCallFunction(call, fileScope) {
  const func = call.bind[0]
  const factor = call.bind.slice(1)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(null, factor.sift.link))
  })
  return AST.createCallExpression(
    AST.createIdentifier(func.sift.text),
    args
  )
}

function makeDockCallTest(call) {
  const test = call.bind[0]
  const make = call.bind[1]
  return AST.createIfStatement(
    makeLink(null, test.sift.link),
    AST.createBlockStatement([makeLink(null, make.sift.link)])
  )
}

function makeDockCallLook() {
  return `debugger`
}

function makeLink(file, link) {
  if (link.form === 'host') {
    return AST.createIdentifier(link.name)
  } else {
    return makeNest(link)
  }
}

function transpile(deck) {
  let file = deck.load[deck.lead]

  const list = Object.values(deck.load)
  const compiledDeck = {
    originalDeck: deck,
    files: {}
  }
  while (list.length) {
    const base = list.shift()
    if (compiledDeck.files[base.road]) {
      continue
    }
    const compiledFile = compiledDeck.files[base.road] = {
      hostFile: base,
      name: {},
      mark: 1,
    }
    makeFile(compiledFile)
  }
  return compiledDeck
}

function makeFile(file) {
  switch (file.hostFile.mint) {
    case `task`:
      makeTaskFile(file)
      break
    case `dock-task`:
      makeDockTaskFile(file)
      break
    case `form`:
      makeFormFile(file)
      break
    case `mine`:
      makeMineFile(file)
      break
    case `mill`:
      makeMillFile(file)
      break
    case `call`:
      makeCallFile(file)
      break
    case `feed`:
      makeFeedFile(file)
      break
    case `test`:
      makeTestFile(file)
      break
    // case `view`:
    //   makeViewFile(file)
    //   break
    // default:
    //   throw file.mint
    //   break
  }
  return file
}

function makeTaskFile(file) {
  file.output = {}

  file.output.task = []

  file.hostFile.task.forEach(task => {
    file.output.task.push(makeTask(file, task))
  })

  // file.output.call = []

  // file.hostFile.call.forEach(call => {
  //   file.output.call.push(call)
  // })
}

/**
 * This is a higher-level function.
 */

function makeTask(file, task) {
  const params = []
  const wait = !!task.wait
  task.base.forEach(base => {
    params.push(AST.createIdentifier(base.name))
  })

  const body = []

  task.zone.forEach(zone => {
    switch (zone.form) {
      case `host`:
        body.push(makeHost(file, zone))
        break
      case `save`:
        body.push(makeSave(file, zone))
        break
      case `turn`:
        body.push(makeTurn(file, zone))
        break
      case `call`:
        body.push(makeCall(file, zone))
        break
    }
  })

  const fxnAST = AST.createFunctionDeclaration(
    AST.createIdentifier(task.name),
    params,
    AST.createBlockStatement(body),
    { async: wait }
  )
  return fxnAST
}

function makeTestFile(bind) {
  return
  importPaths.forEach(load => {
    makeLoad(bind, load)
  })
  bind.file.test.forEach(test => {
    makeTest(bind, test)
  })
}

function makeTest(bind, test) {
  const key = bind.links.task.links[test.name].key
  reference(bind, key)
  bind.calls.push({
    form: 'call',
    name: key
  })
}
