
const fs = require('fs')
const HEAD = fs.readFileSync(`${__dirname}/lib/head/index.js`, 'utf-8')
const PRINT_AST = require('@lancejpollard/normalize-ast.js/print')
const AST = require('@lancejpollard/normalize-ast.js/create')

module.exports = make

function make(base) {
  const compiledDeck = transpile(base)
  return print(compiledDeck)
}

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

function transpile(deck) {
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
    const fork = compiledDeck.files[base.road] = createBaseFork(base)
    makeFile(fork)
  }
  return compiledDeck
}

function makeFile(fork) {
  switch (fork.file.mint) {
    case `base`:
      makeBaseFile(fork)
      break
    case `dock`:
      makeDockFile(fork)
      break
    case `form`:
      makeFormFile(fork)
      break
    case `mine`:
      makeMineFile(fork)
      break
    case `mill`:
      makeMillFile(fork)
      break
    case `call`:
      makeCallFile(fork)
      break
    case `feed`:
      makeFeedFile(fork)
      break
    case `test`:
      makeTestFile(fork)
      break
    // case `view`:
    //   makeViewFile(fork)
    //   break
    // default:
    //   throw fork.mint
    //   break
  }
  return fork
}

function makeBaseFile(fork) {
  fork.output = {}

  fork.output.task = []

  fork.file.task.forEach(task => {
    const taskFork = createNewFork(fork)
    setForkBond({ fork: taskFork, term: 'task', bond: task })
    fork.output.task.push(makeTask(taskFork))
  })

  fork.output.load = []
  fork.file.load.forEach(load => {
    fork.output.load.push(makeLoad(fork, load))
  })

  fork.output.task = []
  fork.file.task.forEach(task => {
    const taskFork = createNewFork(fork)
    setForkBond({ fork: taskFork, term: 'task', bond: task })
    fork.output.task.push(makeTask(taskFork))
  })

  fork.output.form = []
  fork.file.form.forEach(form => {
    const formFork = createNewFork(fork)
    setForkBond({ fork: formFork, term: 'form', bond: form })
    fork.output.form.push(makeForm(formFork))
  })

  fork.output.call = []
  fork.file.call.forEach(call => {
    if (call.form === 'save') {
      fork.output.call.push(makeSave(fork, call))
    } else {
      fork.output.call.push(makeCall(fork, call))
    }
  })

  fork.output.stem = []
  Object.keys(fork.file.stem).forEach(name => {
    const stem = fork.file.stem[name]
    fork.output.stem.push(makeStem(fork, stem))
  })

  // fork.hostFile.call.forEach(call => {
  //   fork.output.call.push(call)
  // })

  fork.bound = makeBaseBindExpression(
    fork.file.road,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      makeKnit('~stem'),
      makeKnit('~form'),
      makeKnit('~form/~name'),
      ...fork.output.load,
      ...fork.output.form,
      ...fork.output.stem,
      ...fork.output.task.map((task, i) => makeFileTask(fork.file.task[i].name, task)),
      ...fork.output.call,
    ]))
  )
}

function makeKnit(line) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('knit'),
    ),
    [AST.createLiteral(line)]
  )
}

function makeStem(fork, stem) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('save'),
    ),
    [AST.createLiteral(`~stem/~${stem.name}`), AST.createLiteral(stem.bond)]
  )
}

function makeBaseBindExpression(road, bind) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('base'),
      AST.createIdentifier('file'),
    ),
    [AST.createLiteral(road), bind]
  )
}

function makeBond(fork, bond) {
  switch (bond.form) {
    case `sift-text`: return AST.createLiteral(bond.text)
    case `text`: return AST.createLiteral(bond.text)
    case `size`: return AST.createLiteral(bond.size)
    case `link`: return makeLink(fork, bond.link)
    case `call`: return makeCall(fork, bond)
    case `task`:
      const taskFork = createNewFork(fork)
      taskFork.task = bond
      return makeTask(taskFork)
    default:
      throw new Error(JSON.stringify(bond))
  }
}

function makeLink(fork, link) {
  if (link.form === 'host') {
    const term = getForkTerm({ fork, name: link.name })
    return AST.createIdentifier(term)
  } else {
    return makeNest(fork, link)
  }
}

function makeSave(fork, zone) {
  const left = zone.nest.form === 'nest' ? makeNest(fork, zone.nest) : makeLink(fork, zone.nest)
  const right = makeBond(fork, zone.sift)
  return AST.createAssignmentExpression(left, right)
}

function makeHost(fork, zone) {
  const term = getForkTerm({ fork, name: zone.name })
  const left = AST.createIdentifier(term)
  const right = zone.sift && makeBond(fork, zone.sift)
  return AST.createVariable(
    'let',
    left,
    right
  )
}

function makeTurn(fork, zone) {
  const argument = makeBond(fork, zone.sift)
  return AST.createReturnStatement(argument)
}

function makeCall(fork, call) {
  const wait = !!call.wait
  const args = []

  call.bind.forEach(b => {
    args.push(makeBond(fork, b.sift))
  })

  call.hook.forEach(h => {
    const params = []
    const hookFork = createNewFork(fork)
    h.link.forEach(link => {
      params.push(makeTerm(hookFork, link.name))
    })
    const body = []
    h.zone.forEach(zone => {
      switch (zone.form) {
        case `host`:
          body.push(makeHost(hookFork, zone))
          break
        case `save`:
          body.push(makeSave(hookFork, zone))
          break
        case `turn`:
          body.push(makeTurn(hookFork, zone))
          break
        case `call`:
          body.push(AST.createReturnStatement(makeCall(hookFork, zone)))
          break
      }
    })

    const fxnAST = AST.createFunctionDeclaration(null, params, AST.createBlockStatement(body))
    args.push(fxnAST)
  })

  return AST.createCallExpression(
    makeTerm(fork, call.name),
    args,
    { await: wait }
  )
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
      computed: rhs.form === 'nest',
    }), makeNest(base));
  }
}

/**
 * This is a higher-level function.
 */

function makeTask(fork) {
  const task = getForkBond(fork, 'task')
  const params = []
  const wait = !!task.wait
  task.link.forEach(base => {
    params.push(makeTerm(fork, base.name))
  })

  const body = []

  task.zone.forEach(zone => {
    switch (zone.form) {
      case `host`:
        body.push(makeHost(fork, zone))
        break
      case `save`:
        body.push(makeSave(fork, zone))
        break
      case `turn`:
        body.push(makeTurn(fork, zone))
        break
      case `call`:
        body.push(AST.createReturnStatement(makeCall(fork, zone)))
        break
    }
  })

  const fxnAST = AST.createFunctionDeclaration(
    makeTerm(fork, task.name),
    params,
    AST.createBlockStatement(body),
    { async: wait }
  )
  return fxnAST
}

function makeDockFile(fork) {
  fork.output = {}

  fork.output.load = []
  fork.file.load.forEach(load => {
    fork.output.load.push(makeLoad(fork, load))
  })

  fork.output.task = []
  fork.file.task.forEach(task => {
    const taskFork = createNewFork(fork)
    setForkBond({ fork: taskFork, term: 'task', bond: task })
    fork.output.task.push(makeDockTask(taskFork))
  })

  fork.output.form = []
  fork.file.form.forEach(form => {
    const formFork = createNewFork(fork)
    setForkBond({ fork: formFork, term: 'form', bond: form })
    fork.output.form.push(makeForm(formFork))
  })

  fork.output.call = []
  fork.file.call.forEach(call => {
    if (call.form === 'save') {
      fork.output.call.push(makeSave(fork, call))
    } else {
      fork.output.call.push(makeCall(fork, call))
    }
  })

  fork.bound = makeBaseBindExpression(
    fork.file.road,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      ...fork.output.load,
      ...fork.output.form,
      ...fork.output.task.map((task, i) => makeFileTask(fork.file.task[i].name, task)),
      ...fork.output.call,
    ]))
  )
}

function makeLoad(fork, load) {
  const fileTerm = getForkTerm({ fork, name: load.road })

  return AST.createVariableDeclaration('const', [
    AST.createVariableDeclarator(
      AST.createIdentifier(fileTerm),
      AST.createCallExpression(
        AST.createMemberExpression(
          AST.createIdentifier('base'),
          AST.createIdentifier('file'),
          false
        ),
        [AST.createLiteral(load.road)]
      )
    )
  ])
}

function makeForm(fork) {
  // create JSON object in JS AST.
  const form = getForkBond(fork, 'form')
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('save'),
    ),
    [AST.createLiteral(`~form/~name/~${form.name}`), AST.createLiteral(form)]
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
  const argument = makeBond(file, zone.sift)
  return AST.createReturnStatement(argument)
}

/**
 * This is a native JavaScript function.
 */

function makeDockTask(fork) {
  const params = []
  const task = getForkBond(fork, 'task')
  const wait = !!task.wait

  task.link.forEach(link => {
    const id = getForkTerm({ fork, name: link.name })
    params.push(AST.createIdentifier(id))
  })

  const body = []

  task.zone.forEach(zone => {
    switch (zone.form) {
      case `host`:
        body.push(makeHost(fork, zone))
        break
      case `save`:
        body.push(makeSave(fork, zone))
        break
      case `turn`:
        body.push(makeTurn(fork, zone))
        break
      case `call`:
        body.push(makeDockCall(fork, zone))
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
  'call-base': makeDockCallCallBase,
  'call-function': makeDockCallCallFunction,
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

function makeThrowError(fork, call) {
  const factor = call.bind.filter(bind => bind.name === 'factor')[0]
  return AST.createThrowStatement(
    AST.createNewExpression(
      AST.createIdentifier('Error'),
      [
        factor.sift.link ? makeLink(fork, factor.sift.link) : AST.createLiteral(factor.sift.text)
      ]
    )
  )
}

function makeDockCall(fork, call) {
  if (!transforms[call.name]) {
    throw new Error(`Missing implementation of ${call.name}`)
  }
  const base = transforms[call.name](fork, call)
  return base
}

function makeDockCallCreateLiteral(fork, call) {
  const literal = call.bind.filter(bind => bind.name === 'literal')[0]
  return AST.createReturnStatement(createLiteral(literal.sift.text))
}

function makeDockCallDelete(fork, call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createUnaryExpression(
    AST.createMemberExpression(
      makeLink(fork, object.sift.link),
      makeLink(fork, aspect.sift.link), true
    ),
    'delete',
    true
  )
}

function makeDockCallGetAspect(fork, call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createReturnStatement(
    AST.createMemberExpression(
      makeLink(fork, object.sift.link),
      AST.createIdentifier(aspect.sift.text),
      false
    )
  )
}

function makeDockCallSetAspect(fork, call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  const factor = call.bind.filter(bind => bind.name === 'factor')[0]
  return AST.createAssignmentExpression(
    AST.createMemberExpression(
      makeLink(fork, object.sift.link),
      AST.createIdentifier(aspect.sift.text),
      false
    ),
    makeLink(fork, factor.sift.link)
  )
}

function makeDockCallGetDynamicAspect(fork, call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createReturnStatement(
    AST.createMemberExpression(
      makeLink(fork, object.sift.link),
      makeLink(fork, aspect.sift.link),
      true
    )
  )
}

function makeDockCallSetDynamicAspect(fork, call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  const factor = call.bind.filter(bind => bind.name === 'factor')[0]
  return AST.createAssignmentExpression(
    AST.createMemberExpression(
      makeLink(fork, object.sift.link),
      makeLink(fork, aspect.sift.link),
      true
    ),
    makeLink(fork, factor.sift.link)
  )
}

function makeDockCallKeyword2(fork, call) {
  const left = call.bind.filter(bind => bind.name === 'left')[0]
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  const right = call.bind.filter(bind => bind.name === 'right')[0]
  return AST.createReturnStatement(
    AST.createBinaryExpression(
      makeLink(fork, left.sift.link),
      keyword.sift.text,
      makeLink(fork, right.sift.link)
    )
  )
}

function makeDockCallKeyword(fork, call) {
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  return AST.createReturnStatement(
    AST.createUnaryExpression(
      makeLink(fork, value.sift.link),
      keyword.sift.text,
      true
    )
  )
}

function makeDockCallDebug() {
  return AST.createDebuggerStatement()
}

function makeTerm(fork, name) {
  const term = getForkTerm({ fork, name })
  return AST.createIdentifier(term)
}

function makeDockCallLoop(fork, call) {
  const check = call.bind.filter(bind => bind.name === 'check')[0]
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  console.log(check.sift.link)
  return AST.createWhileStatement(
    AST.createCallExpression(
      makeTerm(fork, check.sift.link.name)
    ),
    [AST.createCallExpression(
      makeTerm(fork, block.sift.link.name)
    )]
  )
}

function makeDockCallTestElse(fork, call) {
  const check = call.bind.filter(bind => bind.name === 'check')[0]
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  const other = call.bind.filter(bind => bind.name === 'else')[0]
  return AST.createIfStatement(
    AST.createCallExpression(
      makeTerm(fork, check.sift.link.name)
    ),
    AST.createBlockStatement([
      AST.createCallExpression(
        makeTerm(fork, block.sift.link.name)
      )
    ]),
    AST.createBlockStatement([
      AST.createCallExpression(
        makeTerm(fork, other.sift.link.name)
      )
    ])
  )
}

function makeDockCallCallTry(fork, call) {
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  const error = call.bind.filter(bind => bind.name === 'error')[0]
  return AST.createTryStatement(
    AST.createCallExpression(
      makeTerm(fork, block.sift.link.name)
    ),
    AST.createCallExpression(
      makeTerm(fork, error.sift.link.name)
    )
  )
}

function makeDockCallUnaryOperation(fork, call) {
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createReturnStatement(
    AST.createUpdateExpression(
      makeLink(fork, value.sift.link),
      operation.sift.text,
      true
    )
  )
}

function makeDockCallBinaryExpression(fork, call) {
  const left = call.bind.filter(bind => bind.name === 'left')[0]
  const right = call.bind.filter(bind => bind.name === 'right')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createReturnStatement(
    AST.createBinaryExpression(
      makeLink(fork, left.sift.link),
      operation.sift.text,
      right.sift.form === 'sift-text'
        ? AST.createLiteral(right.sift.text)
        : makeLink(fork, right.sift.link)
    )
  )
}

function makeDockCallMake(fork, call) {
  const ctor = call.bind[0]
  const factor = call.bind.slice(1)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(fork, factor.sift.link))
  })
  return AST.createReturnStatement(
    AST.createNewExpression(
      AST.createIdentifier(ctor.sift.text),
      args
    )
  )
}

function makeDockCallCallBase(fork, call) {
  const object = call.bind[0]
  const method = call.bind[1]
  const factor = call.bind.slice(2)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(fork, factor.sift.link))
  })

  if (object.sift.form === 'link') {
    return AST.createReturnStatement(
      AST.createCallExpression(
        AST.createMemberExpression(
          makeLink(fork, object.sift.link),
          AST.createIdentifier(method.sift.text)
        ),
        args
      )
    )
  }

  return AST.createReturnStatement(
    AST.createCallExpression(
      AST.createMemberExpression(
        AST.createIdentifier(object.sift.text),
        AST.createIdentifier(method.sift.text)
      ),
      args
    )
  )
}

function makeDockCallCallFunction(fork, call) {
  const func = call.bind[0]
  const factor = call.bind.slice(1)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(fork, factor.sift.link))
  })
  return AST.createReturnStatement(
    AST.createCallExpression(
      AST.createIdentifier(func.sift.text),
      args
    )
  )
}

function makeDockCallTest(fork, call) {
  const test = call.bind[0]
  const make = call.bind[1]
  return AST.createIfStatement(
    AST.createCallExpression(
      makeTerm(fork, test.sift.link.name)
    ),
    AST.createBlockStatement([
      AST.createCallExpression(
        makeTerm(fork, make.sift.link.name)
      )
    ])
  )
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

function createLiteral(value) {
  return {
    type: 'Literal',
    value,
    raw: value
  }
}

function createBaseFork(file, base) {
  const fork = createNewFork()
  setForkBond({ fork, term: 'file', bond: file })
  setForkBond({ fork, term: 'base', bond: base })
  return fork
}

function createNewFork(base) {
  const head = {
    'fork-base': base,
    'fork-term': {},
    'fork-term-mark': 1
  }
  if (base) {
    head['fork-term-mark'] = base['fork-term-mark']
    base['fork-head'] = head
  }
  return head
}

function getForkTerm({ fork, name }) {
  let base = fork

  while (base) {
    let term = base['fork-term'][name]
    if (term) {
      return term
    }
    base = base['fork-base']
  }

  let term = fork['fork-term'][name] = `x${fork['fork-term-mark']++}`
  return term
}

function setForkBond({ fork, term, bond }) {
  fork[term] = bond
}

function getForkBond(fork, term) {
  let base = fork
  while (base) {
    if (base.hasOwnProperty(term)) {
      return base[term]
    } else {
      base = base['fork-base']
    }
  }
}
