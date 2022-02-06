
# Generate JavaScript from Link Deck

A deck is a package, so this compiles a link package to JavaScript.

```
npm install @lancejpollard/generate-javascript-from-link-deck.js
```

```js
const fs = require('fs')
const load = require('@lancejpollard/load-link-deck.js')
const generateJS = require('@lancejpollard/generate-javascript-from-link-deck.js')

const deck = load('./test/config.json')
const js = generateJS(deck)

fs.writeFileSync(`tmp/out.js`, js)
```

## Implementation

Here we describe how input Link Text gets compiled into JavaScript at each point.

First is the base framework in place for hosting all of the data and functionality.

```js
// internally we do this.
const base = new Base()

base.file(path, file => {
  // 1. define local variables to be used in functions.
  let localVariable

  // 2. construct data objects.

  // 3. define any JavaScript functions.
})

// 5. bind each file so the variables get bound.
//
// this occurs by sorting the dependencies to figure
// out which should go before which other.
base.bind(path)
```

### Function or "Task"

```
# test-deck/task-example

load ./y
  take task my-other-task

task my-task
  base input-text

  call my-other-task
    bind message, link input-text
```

```js
base.file('test-deck/task-example', file => {
  file.task('my-task', function(inputText) {
    base.bind('test-deck/y').call('my-other-task', { message: inputText })
  })
})
```

### Class/Type or "Form"

```
# test-deck/form-example

load ./y
  take form my-other-form

form my-form
  form my-other-form

  base my-attribute
```

```js
base.file('test-deck/form-example', file => {
  file.save('form/my-form', {
    head: [{ name: 'my-other-form' }],
    base: [{ name: 'my-attribute' }]
  })
})
```

### Data/Instances

```

```

### List
