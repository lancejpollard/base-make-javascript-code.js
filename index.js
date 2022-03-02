
const _ = require('lodash')
const to = require('to-case')
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
    if (Array.isArray(compiledFile.bound))
      program.body.push(...compiledFile.bound)
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
    case `lace`:
      makeLaceFile(fork)
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
  const roleMake = {}
  const roleLink = {}
  const roleCall = {}
  fork.role = {
    make: roleMake,
    link: roleLink,
    call: roleCall,
  }

  roleMake.task = []

  roleLink.load = []
  fork.file.load.forEach(load => {
    roleLink.load.push(makeLoad(fork, load))
  })

  roleMake.task = []
  fork.file.task.forEach(task => {
    const taskFork = createNewFork(fork)
    setForkBond({ fork: taskFork, term: 'task', bond: task })
    roleMake.task.push(makeTask(taskFork))
  })

  roleMake.form = []
  fork.file.form.forEach(form => {
    const formFork = createNewFork(fork)
    setForkBond({ fork: formFork, term: 'form', bond: form })
    roleMake.form.push(makeForm(formFork))
  })

  roleMake.call = []
  fork.file.zone.forEach(call => {
    if (call.form === 'save') {
      roleMake.call.push(makeSave(fork, call))
    } else {
      roleMake.call.push(makeCall(fork, call))
    }
  })

  roleMake.stem = []
  Object.keys(fork.file.stem).forEach(name => {
    const stem = fork.file.stem[name]
    roleMake.stem.push(makeStem(fork, stem))
  })

  // fork.hostFile.call.forEach(call => {
  //   roleMake.call.push(call)
  // })

  const call = []
  const callSize = fork[`fork-call-term-mark`]

  if (callSize > 0) {
    call.push(
      AST.createVariable(
        'const',
        AST.createIdentifier('call'),
        AST.createNewExpression(
          AST.createIdentifier('Array'),
          [AST.createLiteral(callSize)]
        )
      )
    )

    // file.save('~call', call)
    call.push(
      makeFileSaveExpression('~call', AST.createIdentifier('call'))
    )
  }

  const role = [
    makeFileBind(fork.file.road, [
      ...call,
      makeKnit('~stem'),
      makeKnit('~form/~name'),
      ...roleMake.form,
      ...roleMake.task.map((task, i) => makeFileTask(fork.file.task[i].name, task)),
      ...roleMake.stem,
    ])
  ]

  if (roleMake.call.length) {
    role.push(
      makeFileBind(fork.file.road, [
        ...roleMake.call,
      ])
    )
  }

  fork.bound = role
}

function makeBasicCallExpression(object, method, factor) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier(object),
      AST.createIdentifier(method)
    ),
    factor
  )
}

function makeCallMark(mark) {
  return makeComputedMemberExpression('call', mark)
}

function makeComputedMemberExpression(object, factor) {
  return AST.createMemberExpression(
    AST.createIdentifier(object),
    AST.createLiteral(factor),
    true // computed
  )
}

function makeCallBind({ mark, file, task }) {
  return AST.createAssignmentExpression(
    makeCallMark(mark),
    makeBasicCallExpression(file, 'task', [task])
  )
}

function makeFileBind(line, load) {
  return makeBaseBindExpression(
    line,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      ...load,
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

function makeFileSaveExpression(line, expression) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('save'),
    ),
    [AST.createLiteral(line), expression]
  )
}

function makeLace(fork, lace) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('save'),
    ),
    [AST.createLiteral(`~lace/~${lace.name}`), AST.createLiteral(lace)]
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

function makeBaseBindExpression(line, bind) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('base'),
      AST.createIdentifier('file'),
    ),
    [AST.createLiteral(line), bind]
  )
}

function makeBond(fork, bond) {
  switch (bond.form) {
    case `text`: return AST.createLiteral(makeCord(bond.text))
    case `size`: return AST.createLiteral(bond.size)
    case `link`: return makeLink(fork, bond.link)
    case `call`: return makeCall(fork, bond)
    case `task`:
      const taskFork = createNewFork(fork)
      taskFork.task = bond
      return makeTask(taskFork)
    case `make`:
      return AST.createObjectExpression(
        bond.bind.map(bind => {
          return AST.createProperty(
            AST.createLiteral(bind.name),
            makeBond(fork, bind.bond)
          )
        })
      )
    case `loan`:
      return makeTerm(fork, bond.name)
    case `loan-nest`:
      return makeNest(fork, bond.nest.nest)
    case `read-nest`:
      return makeNest(fork, bond.nest.nest)
    default:
      if (Array.isArray(bond)) {
        return AST.createArrayExpression(
          bond.map(bond => makeBond(fork, bond))
        )
        // TODO: create literal object manually.
        // return bond.
      } else {
        return AST.createObjectExpression(Object.keys(bond).map(name => {
          const val = bond[name]
          if (val && typeof val === 'object') {
            const newBond = makeBond(fork, val)
            return AST.createProperty(AST.createLiteral(name), newBond)
          } else {
            return AST.createProperty(AST.createLiteral(name), AST.createLiteral(val))
          }
        }))
      }
      return AST.createLiteral(bond)
      // throw new Error(JSON.stringify(bond))
  }
}

function makeLink(fork, link) {
  if (link.form === 'host') {
    const term = getForkHostTerm({ fork, name: link.name })
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
  const term = getForkHostTerm({ fork, name: zone.name })
  const left = AST.createIdentifier(term)
  const right = zone.bond && makeBond(fork, zone.bond)
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
    args.push(makeBond(fork, b.bond))
  })

  call.hook.forEach(h => {
    const params = []
    const hookFork = createNewFork(fork)
    h.link.forEach(link => {
      params.push(makeTerm(hookFork, link.name))
    })
    const body = []
    h.zone.forEach((zone, i) => {
      let statement
      switch (zone.form) {
        case `host`:
          statement = makeHost(hookFork, zone)
          break
        case `save`:
          statement = makeSave(hookFork, zone)
          break
        case `turn`:
          statement = makeTurn(hookFork, zone)
          break
        case `call`:
          statement = makeCall(hookFork, zone)
          break
      }

      if (statement) {
        if (i === h.zone.length - 1) {
          statement = AST.createReturnStatement(statement)
        }
        body.push(statement)
      }
    })

    const fxnAST = AST.createFunctionDeclaration(
      null,
      params,
      AST.createBlockStatement(body)
    )
    args.push(fxnAST)
  })

  return AST.createCallExpression(
    call.name.form === 'nest' ? makeNest(fork, call.name.nest) : makeCallTerm(fork, call.name),
    args,
    { await: wait }
  )
}

function makeNest(fork, node, isBase = true) {
  if (node.form == 'site') {
    return isBase ? makeTerm(fork, node.name) : {
      type: 'Identifier',
      name: node.name,
    };
  } else {
    const [base, ...props] = node.link;
    return props.reduce((lhs, rhs) => ({
      type: 'MemberExpression',
      object: lhs,
      property: makeNest(fork, rhs, false),
      computed: rhs.form === 'nest',
    }), makeNest(fork, base, true));
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

  task.zone.forEach((zone, i) => {
    let statement
    let isTurn
    switch (zone.form) {
      case `host`:
        statement = makeHost(fork, zone)
        break
      case `save`:
        statement = makeSave(fork, zone)
        break
      case `turn`:
        isTurn = true
        statement = makeTurn(fork, zone)
        break
      case `call`:
        // last statement add return to only.
        statement = makeCall(fork, zone)
        break
    }

    if (statement) {
      if (i === task.zone.length - 1 && !isTurn) {
        statement = AST.createReturnStatement(statement)
      }
      body.push(statement)
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
  fork.file.zone.forEach(call => {
    if (call.form === 'save') {
      fork.output.call.push(makeSave(fork, call))
    } else {
      fork.output.call.push(makeCall(fork, call))
    }
  })

  fork.bound = [makeBaseBindExpression(
    fork.file.road,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      ...fork.output.load,
      ...fork.output.form,
      ...fork.output.task.map((task, i) => makeFileTask(fork.file.task[i].name, task)),
      ...fork.output.call,
    ]))
  )]
}

function makeLoad(fork, load) {
  const fileTerm = getForkFileTerm({ fork, name: load.road })

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

function replaceKeywords(string) {
  switch (string) {
    case 'case': return '_case'
    default: return string
  }
}

function makeForm(fork) {
  // create JSON object in JS AST.
  const form = getForkBond(fork, 'form')
  const task = form.task.filter(x => x.form !== 'task-loan').map(task => {
    return AST.createMethodDefinition(
      AST.createIdentifier(replaceKeywords(to.camel(task.name))),
      AST.createFunctionExpression(null, [], AST.createBlockStatement([]))
    )
  })
  const params = form.link.map(link => {
    return AST.createIdentifier(replaceKeywords(to.camel(link.name)))
  })
  const assignments = form.link.map(link => {
    return AST.createAssignmentExpression(
      AST.createMemberExpression(
        AST.createIdentifier('this'),
        AST.createIdentifier(replaceKeywords(to.camel(link.name)))
      ),
      AST.createIdentifier(replaceKeywords(to.camel(link.name)))
    )
  })
  return makeFileForm(form.name, AST.createClassDeclaration(
    AST.createIdentifier(to.pascal(form.name)),
    null,
    AST.createClassBody([
      AST.createMethodDefinition(
        AST.createIdentifier('constructor'),
        AST.createFunctionExpression(null, params, AST.createBlockStatement(assignments)),
        'constructor',
      ),
      ...task
    ])
  ))
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('save'),
    ),
    [AST.createLiteral(`~form/~name/~${form.name}`), AST.createLiteral(form)]
  )
}

function makeFileForm(name, form) {
  return AST.createCallExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier('form'),
    ),
    [
      AST.createLiteral(name),
      form
    ]
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
    const id = getForkHostTerm({ fork, name: link.name })
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
        factor.bond.form === 'text'
          ? makeText(fork, factor.bond.text)
          : makeBond(fork, factor.bond)
      ]
    )
  )
}

function makeCord(list) {
  return list.map(stem => stem.text).join('')
}

function makeText(fork, text) {
  console.log(text)
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
  return AST.createReturnStatement(createLiteral(makeCord(literal.bond.text)))
}

function makeDockCallDelete(fork, call) {
  const object = call.bind.filter(bind => bind.name === 'object')[0]
  const aspect = call.bind.filter(bind => bind.name === 'aspect')[0]
  return AST.createUnaryExpression(
    AST.createMemberExpression(
      makeBond(fork, object.bond),
      makeBond(fork, aspect.bond), true
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
      makeBond(fork, object.bond),
      AST.createIdentifier(makeCord(aspect.bond.text)),
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
      AST.createIdentifier(makeCord(aspect.sift.text)),
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
      makeBond(fork, object.bond),
      makeBond(fork, aspect.bond),
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
      makeBond(fork, object.bond),
      makeBond(fork, aspect.bond),
      true
    ),
    makeBond(fork, factor.bond)
  )
}

function makeDockCallKeyword2(fork, call) {
  const left = call.bind.filter(bind => bind.name === 'left')[0]
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  const right = call.bind.filter(bind => bind.name === 'right')[0]
  return AST.createReturnStatement(
    AST.createBinaryExpression(
      makeBond(fork, left.bond),
      makeCord(keyword.bond.text),
      makeBond(fork, right.bond)
    )
  )
}

function makeDockCallKeyword(fork, call) {
  const keyword = call.bind.filter(bind => bind.name === 'keyword')[0]
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  return AST.createReturnStatement(
    AST.createUnaryExpression(
      makeBond(fork, value.bond),
      makeCord(keyword.bond.text),
      true
    )
  )
}

function makeDockCallDebug() {
  return AST.createDebuggerStatement()
}

function makeTerm(fork, name) {
  const term = getForkHostTerm({ fork, name })
  return AST.createIdentifier(term)
}

function makeCallTerm(fork, name) {
  const mark = getForkCallMark({ fork, name })
  return makeCallMark(mark)
}

function makeDockCallLoop(fork, call) {
  const check = call.bind.filter(bind => bind.name === 'check')[0]
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  return AST.createWhileStatement(
    AST.createCallExpression(
      makeTerm(fork, check.bond.name)
    ),
    [AST.createCallExpression(
      makeTerm(fork, block.bond.name)
    )]
  )
}

function makeDockCallTestElse(fork, call) {
  const check = call.bind.filter(bind => bind.name === 'check')[0]
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  const other = call.bind.filter(bind => bind.name === 'else')[0]
  return AST.createIfStatement(
    AST.createCallExpression(
      makeBond(fork, check.bond)
    ),
    AST.createBlockStatement([
      AST.createCallExpression(
        makeBond(fork, block.bond)
      )
    ]),
    AST.createBlockStatement([
      AST.createCallExpression(
        makeBond(fork, other.bond)
      )
    ])
  )
}

function makeDockCallCallTry(fork, call) {
  const block = call.bind.filter(bind => bind.name === 'block')[0]
  const error = call.bind.filter(bind => bind.name === 'error')[0]
  return AST.createTryStatement(
    AST.createCallExpression(
      makeBond(fork, block.bond)
    ),
    AST.createCallExpression(
      makeBond(fork, error.bond)
    )
  )
}

function makeDockCallUnaryOperation(fork, call) {
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createReturnStatement(
    AST.createUpdateExpression(
      makeBond(fork, value.bond),
      makeCord(operation.bond.text),
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
      makeBond(fork, left.bond),
      makeCord(operation.bond.text),
      right.bond.text
        ? AST.createLiteral(makeCord(right.bond.text))
        : makeBond(fork, right.bond)
    )
  )
}

function makeDockCallMake(fork, call) {
  const ctor = call.bind[0]
  const factor = call.bind.slice(1)
  const args = []
  factor.forEach(factor => {
    args.push(makeBond(fork, factor.bond))
  })
  return AST.createReturnStatement(
    AST.createNewExpression(
      AST.createIdentifier(makeCord(ctor.bond.text)),
      args
    )
  )
}

function makeDockCallCallBase(fork, call) {
  const object = call.bind[0]
  const method = call.bind[1]

  if (object.bond.form === 'loan') {
    const factor = [object].concat(call.bind.slice(2))
    const args = []
    factor.forEach(factor => {
      args.push(makeTerm(fork, factor.bond.name))
    })
    return AST.createReturnStatement(
      AST.createCallExpression(
        AST.createMemberExpression(
          makeTerm(fork, object.bond.name),
          AST.createIdentifier(makeCord(method.bond.text))
        ),
        args
      )
    )
  }

  const factor = call.bind.slice(2)
  const args = []
  factor.forEach(factor => {
    args.push(makeTerm(fork, factor.bond.name))
  })

  return AST.createReturnStatement(
    AST.createCallExpression(
      AST.createMemberExpression(
        AST.createIdentifier(makeCord(object.bond.text)),
        AST.createIdentifier(makeCord(method.bond.text))
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
    args.push(makeBond(fork, factor.bond))
  })
  return AST.createReturnStatement(
    AST.createCallExpression(
      AST.createIdentifier(makeCord(func.bond.text)),
      args
    )
  )
}

function makeDockCallTest(fork, call) {
  const test = call.bind[0]
  const make = call.bind[1]
  return AST.createIfStatement(
    AST.createCallExpression(
      makeBond(fork, test.bond)
    ),
    AST.createBlockStatement([
      AST.createCallExpression(
        makeBond(fork, make.bond)
      )
    ])
  )
}

function makeLaceFile(fork) {
  fork.output = {}

  fork.output.lace = []
  Object.keys(fork.file.lace).forEach(name => {
    const lace = fork.file.lace[name]
    fork.output.lace.push(makeLace(fork, lace))
  })

  // fork.hostFile.call.forEach(call => {
  //   fork.output.call.push(call)
  // })

  fork.bound = makeBaseBindExpression(
    fork.file.road,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      makeKnit('~lace'),
      makeKnit('~form/~name'),
      ...fork.output.lace,
    ]))
  )
  return
  importPaths.forEach(load => {
    makeLoad(bind, load)
  })
  bind.file.test.forEach(test => {
    makeTest(bind, test)
  })
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
    'fork-base': base
  }
  if (base) {
    base['fork-head'] = head
    head['fork-host-term'] = _.clone(base['fork-host-term'])
    head['fork-host-term-mark'] = _.clone(base['fork-host-term-mark'])
  } else {
    head['fork-file-term'] = {}
    head['fork-file-term-mark'] = 0
    head['fork-call-term'] = {}
    head['fork-call-term-mark'] = 0
    head['fork-host-term'] = {}
    head['fork-host-term-mark'] = 0
  }
  return head
}

function getForkCallMark({ fork, name }) {
  return getForkTermBase({ fork, name, form: 'call' })
}

function getForkHostTerm({ fork, name }) {
  const mark = getForkTermTree({ fork, name, form: 'host' })
  return `host_${mark + 1}`
}

function getForkFileTerm({ fork, name }) {
  const mark = getForkTermTree({ fork, name, form: 'file' })
  return `file_${mark + 2}`
}

function getForkTermBase({ fork, name, form }) {
  let base = fork
  let forkTerm = `fork-${form}-term`
  let forkTermMark = `fork-${form}-term-mark`

  while (base) {
    let bond = base[forkTerm]
    if (bond) {
      break
    }
    base = base['fork-base']
  }

  const term = base[forkTerm][name] = base[forkTermMark]++
  return term
}

let C = 0
function getForkTermTree({ fork, name, form }) {
  let base = fork
  let forkTerm = `fork-${form}-term`
  let forkTermMark = `fork-${form}-term-mark`

  while (base) {
    let term = base[forkTerm][name]
    if (term != null) {
      return term
    }
    base = base['fork-base']
  }

  const term = fork[forkTerm][name] = fork[forkTermMark]++

  // let head = fork['fork-head']
  // while (head) {
  //   head[forkTermMark]++
  //   head = head['fork-head']
  // }
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
