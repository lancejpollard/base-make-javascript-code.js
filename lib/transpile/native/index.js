
const AST = require('@lancejpollard/normalize-ast.js/create')
const makeRoad = require('../../make')
const {
  makeLoad,
  makeSave,
  makeHost,
  makeCall,
  makeNest,
  makeBaseBindExpression,
} = makeRoad;

module.exports = makeDockTaskFile

function makeDockTaskFile(file) {
  file.output = {}
  file.originalFile.load.forEach(load => {
    makeLoad(file, load)
  })
  file.output.task = []
  file.originalFile.task.forEach(task => {
    file.output.task.push(makeDockTask(file, task))
  })
  file.output.call = []
  file.originalFile.call.forEach(call => {
    if (call.form === 'save') {
      file.output.call.push(makeSave(file, call))
    } else {
      file.output.call.push(makeCall(file, call))
    }
  })
  file.bound = makeBaseBindExpression(
    file.originalFile.road,
    AST.createFunctionDeclaration(null, [
      AST.createIdentifier('file')
    ], AST.createBlockStatement([
      ...file.output.call,
      makeFileObject('task'),
      ...file.output.task.map((task, i) => makeFileTask(file.originalFile.task[i].name, task)),
    ]))
  )
}

function makeFileObject(name) {
  return AST.createAssignmentExpression(
    AST.createMemberExpression(
      AST.createIdentifier('file'),
      AST.createIdentifier(name),
    ),
    AST.createObjectExpression([])
  )
}

function makeFileTask(name, task) {
  return AST.createAssignmentExpression(
    AST.createMemberExpression(
      AST.createMemberExpression(
        AST.createIdentifier('file'),
        AST.createIdentifier('task'),
      ),
      AST.createLiteral(name),
      true
    ),
    task
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
  'call-head': makeDockCallCallHead,
  'call-twin': makeDockCallCallTwin,
  'call-try': makeDockCallCallTry,
  'test-else': makeDockCallTestElse,
  'loop': makeDockCallLoop,
  'debug': makeDockCallDebug,
  'call-keyword':  makeDockCallKeyword,
  'call-keyword-2':  makeDockCallKeyword2,
  'set-dynamic-aspect': makeDockCallSetDynamicAspect,
  'get-dynamic-aspect': makeDockCallGetDynamicAspect,
  'delete': makeDockCallDelete,
  'create-literal': makeDockCallCreateLiteral,
}

function makeDockCall(file, call) {
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
    [makeLink(null, block.sift.link)],
    [makeLink(null, other.sift.link)]
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

function makeDockCallCallHead(call) {
  const value = call.bind.filter(bind => bind.name === 'value')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createUpdateExpression(
    makeLink(null, value.sift.link),
    operation.sift.text,
    true
  )
}

function makeDockCallCallTwin(call) {
  const left = call.bind.filter(bind => bind.name === 'left')[0]
  const right = call.bind.filter(bind => bind.name === 'right')[0]
  const operation = call.bind.filter(bind => bind.name === 'operation')[0]
  return AST.createBinaryExpression(
    makeLink(null, left.sift.link),
    operation.sift.text,
    makeLink(null, right.sift.link)
  )
}

function makeDockCallMake(call) {
  const ctor = call.bind[0]
  const factor = call.bind.slice(1)
  const args = []
  factor.forEach(factor => {
    args.push(makeLink(null, factor.sift.link))
  })
  return AST.createNewExpression(
    ctor.sift.text,
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
    [makeLink(null, make.sift.link)]
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
