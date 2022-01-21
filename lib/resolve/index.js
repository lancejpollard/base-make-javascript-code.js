
// set the appropriate variable names throughout the AST
// get rid of unused variable declarations

module.exports = resolve

function resolve(compiledDeck) {
  Object.keys(compiledDeck.files).forEach(path => {
    const compiledFile = compiledDeck.files[path]
    const task = (compiledFile.output ?? {}).task || []
    const cll = (compiledFile.output ?? {}).call || []
    const scope = { index: 1 }
    cll.forEach(c => {
      call(resolvers, c.type, c, scope)
    })
    task.forEach(t => {
      call(resolvers, t.type, t, { ...scope })
    })
  })
}

const resolvers = {
  FunctionDeclaration: resolve_FunctionDeclaration,
  VariableDeclaration: resolve_VariableDeclaration,
  CallExpression: resolve_CallExpression,
  ReturnStatement: resolve_ReturnStatement,
  AssignmentExpression: resolve_AssignmentExpression,
}

function resolve_AssignmentExpression(node, scope) {
  if (node.left.type === 'Identifier') {
    replaceName(node.left, 'name', scope)
  }
}

function resolve_ReturnStatement(node, scope) {
  call(resolvers, node.argument.type, node.argument, scope)
}

function resolve_CallExpression(node, scope) {
  node.arguments.forEach(arg => {
    if (arg.type === 'Identifier') {
      optionallyReplaceName(arg, 'name', scope)
    }
  })
  if (node.callee.type === 'MemberExpression') {
    optionallyReplaceName(node.callee.object, 'name', scope)
  }
}

function resolve_FunctionDeclaration(node, scope) {
  node.params.forEach(param => {
    if (param.type === 'Identifier') {
      replaceName(param, 'name', scope)
    }
  })
  node.body.body.forEach(bd => {
    call(resolvers, bd.type, bd, scope)
  })
}

function resolve_VariableDeclaration(node) {

}

function call(obj, method, ...args) {
  if (!obj.hasOwnProperty(method)) {
    throw new Error(`Missing method ${method}`)
  }

  return obj[method](...args)
}

function optionallyReplaceName(node, prop, scope) {
  const oldName = node[prop]
  let newNameData = scope[oldName]
  if (!newNameData || !newNameData.hasOwnProperty('__ID__')) {
    return
  }
  const newName = newNameData.__ID__
  node[prop] = newName
}

function replaceName(node, prop, scope) {
  const oldName = node[prop]
  let newNameData = scope[oldName]
  if (!newNameData || !newNameData.hasOwnProperty('__ID__')) {
    newNameData = scope[oldName] = scope[oldName] || { __ID__: `x${scope.index++}` }
  }
  const newName = newNameData.__ID__
  node.name = newName
}
