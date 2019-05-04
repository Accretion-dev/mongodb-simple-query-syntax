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
## auto complete state
##### cursor type is 'key'
* unfinished key name:
  * autocomplete all key names
  * if position is last, `search '...' (empty group)`
* finishend key name:
  * `<fullkey>`: e.g., `tags|in`, `tags.tag_name`
    * autocomplete list: list `value struct`, `:`, `.` and `other fields`
      * type is `string`, `date`, `number`:
        1. `<fullkey>:`
          * `<fullkey>:"▮"` // if type is date
          * `<fullkey>:▮`   // if type is other
        2. `<fullkey>|▮`    // list ops
        3. `<fullkey>.number` // if array, empty group
        3. other keys (if exists)
      * type is `boolean`
        1. `true`
        2. `false`
      * type is `object` and `array` is false:
        1. `<fullkey>.`
        2. `<fullkey>:{▮}` // not frequent
        3. other keys (if exists)
      * type is `array` of `object`
        1. `<fullkey>.▮`    // list subfields(plus .number(empty group))
        2. `<fullkey>|▮`    // list ops
        3. `<fullkey>:`
          * `<fullkey>:{▮}` // trigger 'object' query for AOO, need 'queryKey'
          * `<fullkey>:[▮]` // trigger 'array' query for AOO, need 'queryKey'
          * `<fullkey>:"▮"` // trigger 'string' query for AOO, need 'queryKey'
          * `<fullkey>:▮`   // leave further autocomplete for ValueBlock, need 'queryKey'
        4. other keys (if exists)
      * type is `fields`:
        1. `$<fields>`
      * type is `expr`:
        * is array
          2. `<fullkey>:[▮]`
        * not array
          2. `<fullkey>:{▮}`
  * `<fullkey>.`: e.g., `tags.`, `r.Article.`
    * autocomplete list: list subfields
      1. `<fullkey>.<subkeys>`
      2. `<fullkey>.index` (if array is true, list this at end as an empty group)
  * `<fullkey>|<unfinishedOP>`: e.g., `tags.tag_name|`, `tags|i`
    * autocomplete list: list all ops
      1. `<fullkey>|<ops>`
##### cursor type is value
type:
  * date
    * `date(support complex syntax)(always)`
  * number
    * `number(always)`
  * string
    * empty:
      * `string(always)`
        * `"▮"`
      * `regex`
        * `/▮/`
      * values: (if have data)
        * `...`
    * not empty: (if have data)
      * values:
        * `...`
  * expr
    * `expr(always)`
*
