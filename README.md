# mongodb-simple-query-syntax
A simplified syntax to generate mongodb query json.
## usage:
``` javascript
const {parse} = require('../../index.js')
let result = parse(input)
```
## definations
* `SimpleString`: `[a-zA-Z_$] [0-9a-zA-Z_$.]*`
* `String`: javascript strings, examples
  * `"foo"`
  * `"bar"`
  * `"with \\ escape"`
  * `"with \t\n special"`
* pair: "`key`: `value`"
  * `key` must be a `SimpleString`
  * `value` could be
    * `true, false, null`
    * `Number`
    * `Object`
    * `Array`
    * `SimpleString`
    * `String`
## examples
* => means 'be compiled into'
```
// paris
good: true  => {"good": true}
good: false => {"good": false}
good: null  => {"good": null}
good: 123   => {"good": 123}
good: 1e3   => {"good": 1000}
good: nice  => {"good": "nice"}
good: "nice"  => {"good": "nice"}
good: 'nice'  => {"good": "nice"}
good: 'ni\'ce'  => {"good": "ni'ce"}
good: 'ni\\ce'  => {"good": "ni\ce"}
good: [123, foo, bar, 'test', {nice: fine}]  => {"good": [123, "foo", "bar", "test", {"nice": "fine"}]}

// pairs with nested operation
good|in: [foo, bar, 'foo bar'] => {"good": {"$in": ["foo", "bar", "foo bar"]}}
good|in|size: 10 => {"good": {"$in": {"$size": 10}}}
good.nice|in|size: 10 => {"good.nice": {"$in": {"$size": 10}}}

// logical operations
// not seperator: '~'
// add seperator: "&&", " "
// or seperator: '||'
// priority: not > and > or
good.nice: foo bad.evil: bar => {$and: [{"good.nice":"foo"}, {'bad.evil': "bar"}]}
good.nice: foo && bad.evil: bar => {$and: [{"good.nice":"foo"}, {'bad.evil': "bar"}]}
good.nice: foo && ~bad.evil: bar => {$and: [{"good.nice":"foo"}, {$not: {'bad.evil': "bar"}]}
foo:foo && bar:bar || ~foobar:foobar && barfoo:barfoo
  => {"$or": [
       {"$and": [{"foo":"foo"}, {"bar":"bar"}]},
       {"$and": [{"$not": {"foobar":"foobar"}}, {"barfoo": "barfoo"}]}
     ]}
```
