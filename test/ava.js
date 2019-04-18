import test from 'ava'
import path from 'path'
import {SyntaxError, parse, Tracer} from '../index.js'
console.log('new run')

function range(start,end,step) {
  // for some reason,  [...Array(20).keys()] do not work
  let result = []
  step = step || 1
  if (end === undefined) {
    for (let i=0; i<start; i+=step) {
      result.push(i)
    }
  } else {
    for (let i=start; i<end; i+=step) {
      result.push(i)
    }
  }

  return result
}

let todo, todoObj
todo = `
  title|startsWith: 'foo bar' ||
  tags|elemMatch:{tagname|startsWith: astro, time|lt: } ||
  tags.tag_name: 'good' && ~(tags.time|lt: '2018') ||
  tags.tag_name|in:[
    foo, bar, 'a\\'b',
  ] ||
  halftype: ||
  flags|:flag  ||
  simple|level1|level2|level3 : s123 ||
  simple|level1|level2| : s12$ ||
  simple|level1|level2| : ||
  ( (unfinished0) unfinished1) ||
  'unfinished2' ||
  unfinished3: {
    unfinished4,
    'undefined%5',
    unfinished6: ,
    unfinished7|op8|:,
    level1|in: { level2|in|in: { level3|in|in|in: good}},
  }
`
todoObj = {$or: [
  {title: {$startsWith: 'foo bar'}},
  {tags: {$elemMatch: {
    tagname: {$startsWith: 'astro'},
    time: {$lt: null}
  }}},
  {$and: [
    {'tags.tag_name': 'good'},
    {$not: {'tags.time': {$lt: '2018'}}},
  ]},
  {'tags.tag_name':{$in:['foo', 'bar', 'a\'b']}},
  {halftype: null},
  {flags:{$:'flag'}},
  {simple:{$level1:{$level2:{$level3: 's123'}}}},
  {simple:{$level1:{$level2:{$: 's12$'}}}},
  {simple:{$level1:{$level2:{$: null}}}},
  {$and: ['unfinished0', 'unfinished1']},
  'unfinished2',
  {unfinished3: {
    unfinished4: null, 'undefined%5': null, unfinished6: null, unfinished7: {$op8: {$: null}},
    level1: { $in:{
        level2: {
          $in:{ $in:{
              level3: {$in:{$in:{$in: 'good' }}}
          } }
      } }
    },
  }},
]}

test('test complex parser', t => {
  let result
  let blanktracer = {}
  blanktracer.trace = _ => {}
  parse.debug = function (str, offset) {
    let tracer = new Tracer({content: str, simple: true})
    let result = this(str, {tracer})
    console.log(str)
    console.log('    ====>')
    console.log(JSON.stringify(result, null, 2))
    if (offset !== undefined) {
      if (Array.isArray(offset)) {
        for (let each of offset) {
          tracer.getAutocompleteType(each, true)
        }
      } else {
        tracer.getAutocompleteType(offset, true)
      }
    }
  }
  function same (todo, value) {
    let result
    for (let each of todo) {
      result = parse(each, {tracer:blanktracer})
      t.is(result, value)
      result = parse(" "+each, {tracer:blanktracer})
      t.is(result, value)
      result = parse(each+" ", {tracer:blanktracer})
      t.is(result, value)
      result = parse(" "+each+" ", {tracer:blanktracer})
      t.is(result, value)
    }
  }
  function sameD (todo, value) {
    let result
    for (let each of todo) {
      result = parse(each, {tracer:blanktracer})
      t.deepEqual(result, value)
      result = parse(" "+each, {tracer:blanktracer})
      t.deepEqual(result, value)
      result = parse(each+" ", {tracer:blanktracer})
      t.deepEqual(result, value)
      result = parse(" "+each+" ", {tracer:blanktracer})
      t.deepEqual(result, value)
    }
  }
  // numbers
  let numbers = [
    0, '-0', 1, 11, -12, 121.223, -121.223, 131e1, -131e1, 123.123e-1, -123.123e-1
  ]
  for (let each of numbers) {
    result = parse(String(each), {tracer: blanktracer})
    t.is(Number(each), result)
    result = parse(" "+String(each), {tracer: blanktracer})
    t.is(Number(each), result)
    result = parse(String(each)+" ", {tracer: blanktracer})
    t.is(Number(each), result)
    result = parse(" "+String(each)+" ", {tracer: blanktracer})
    t.is(Number(each), result)
  }
  // strings
  same(['hehehe', `'hehehe'`, `"hehehe"`], 'hehehe')
  same([`'he\thehe'`, `"he\thehe"`], 'he\thehe')
  same([`'he\\\\hehe'`, `"he\\\\hehe"`], 'he\\hehe')
  same([`'2018-01-01T00:00:00'`, `"2018-01-01T00:00:00"`], '2018-01-01T00:00:00')
  // Block
  sameD([
    `good:good`,
    `good  :  good`,
    `'good'  :  good`,
    `'good'  :  'good'`,
    `good  :  'good'`,
  ], {good: "good"})
  sameD([
    `good:`,
    `good  :  `,
    `'good'  :  `,
    `'good'  :  `,
    `good  : `,
  ], {good: null})
  sameD([
    `$good:good`,
    `$good  :  good`,
    `'$good'  :  good`,
    `'$good'  :  'good'`,
    `$good  :  'good'`,
  ], {$good: "good"})
  sameD([
    `$good| in:good`,
    `$good |in  :  good`,
    `'$good' | in  :  good`,
    `'$good' | in  :  'good'`,
    `$good|in  :  'good'`,
  ], {$good: {$in: "good"}})
  sameD([
    `$good| in:`,
    `$good |in  :  `,
    `'$good' | in  :  `,
    `'$good' | in  :  `,
    `$good|in  :  `,
  ], {$good: {$in: null}})
  sameD([
    `good:[asd , 123, 123.456, 'asdf\\\\fd', '(*&)""']`,
    `'good'  :  ['asd' , 123 , 1.23456e2, 'asdf\\\\fd', "(*&)\\"\\""]`,
  ], {good: ['asd', 123, 123.456, 'asdf\\fd', '(*&)""']})
  sameD([
    `good:{1:asd , asd:123, 'haha':123.456, "he\\"he":'asdf\\\\fd', $foo:'(*&)""'}`,
    `'good'  :  {1:'asd' , 'asd':123 , "haha":1.23456e2, 'he\\"he':'asdf\\\\fd', "$foo":"(*&)\\"\\""}`,
  ], {good: {1:'asd', asd:123, haha:123.456, 'he"he':'asdf\\fd', $foo:'(*&)""'}})
  sameD([
    `good:{1:[ asd, 'fd\\\\a', 321.123, {b:1}] , asd:{a:123, b:{a:321, b:['haha', 321, '321']}}, 'haha':123.456, "he\\"he":'asdf\\\\fd', $foo:'(*&)""'}`,
  ], { good:{1:[ 'asd', 'fd\\a', 321.123, {b:1}] , asd:{a:123, b:{a:321, b:['haha', 321, '321']}}, 'haha':123.456, 'he"he':'asdf\\fd', $foo:'(*&)""'} })
  sameD([
    `good:good bad:bad`,
    `good  :  'good' bad : bad`,
    `good  :  good 'bad' : bad`,
    `good  :  good && 'bad' : bad`,
    `good  :  "good"  'bad' : 'bad'`,
  ], {$and: [{good:'good'}, {bad:'bad'}]})
  sameD([
    `good:good bad:bad nice:nice`,
    `good  :  'good' bad : bad && nice:'nice'`,
    `good  :  good 'bad' : bad && nice:"nice"`,
    `good  :  good && 'bad' : bad && "nice":nice`,
    `good  :  "good" 'bad' : 'bad' "nice":nice`,
  ], {$and: [{good:'good'}, {bad:'bad'}, {nice: 'nice'}]})
  sameD([
    `good:good bad:bad nice:'nice nice' fine:fine`,
  ], {$and: [{good:'good'}, {bad:'bad'}, {nice: 'nice nice'}, {fine:'fine'}]})
  sameD([
    `good:good bad:bad || nice:'nice nice' fine:fine`,
  ], {$or: [{$and: [{good:'good'}, {bad:'bad'}]},{$and:[{nice: 'nice nice'}, {fine:'fine'}]}]})
  sameD([
    `good:good (bad:bad nice:'nice nice') fine:fine`,
  ], {$and: [{good:'good'}, {$and: [{bad:'bad'}, {nice: 'nice nice'}]}, {fine:'fine'}]})
  sameD([
    `good:good (bad:bad || nice:'nice nice') fine:fine`,
  ], {$and: [{good:'good'}, {$or: [{bad:'bad'}, {nice: 'nice nice'}]}, {fine:'fine'}]})
  sameD([
    `good:good && good1:good1 || bad:bad bad1: bad1 || nice:'nice nice' nice1: nice1 || fine:fine fine1: fine1`,
  ], {$or: [
    {$and:[{good:'good'},{good1:'good1'}]},
    {$and:[{bad:'bad'}, {bad1:'bad1'}]},
    {$and:[{nice:'nice nice'},{nice1:'nice1'}]},
    {$and:[{fine:'fine'},{fine1:'fine1'}]},
  ]})
  sameD([
    `good:good && good1:good1 || ( bad:bad (bad1: bad1 || nice:'nice nice') nice1: nice1 ) || fine:fine fine1: fine1`,
  ], {$or: [
    {$and:[{good:'good'},{good1:'good1'}]},
    {$and: [{bad:'bad'}, {$or:[{bad1:'bad1'}, {nice: 'nice nice'}]}, {nice1: 'nice1'}]},
    {$and:[{fine:'fine'},{fine1:'fine1'}]},
  ]})
  sameD([
    `good: && good1: || ( bad: (bad1: || nice:) nice1:) || fine: && fine1: `,
  ], {$or: [
    {$and:[{good:null},{good1:null}]},
    {$and: [{bad:null}, {$or:[{bad1:null}, {nice: null}]}, {nice1: null}]},
    {$and:[{fine:null},{fine1:null}]},
  ]})
  let cursors = range(0, 581)
  parse.debug(todo, cursors)
  sameD([
    `title|startsWith: 'foo bar' || tags|elemMatch:{tagname|startsWith: astro, time|lt: } || tags.tag_name: 'good' && ~(tags.time|lt: '2018') || tags.tag_name|in:[foo, bar, 'a\\'b'] || halftype`,
  ], {$or: [
    {title: {$startsWith: 'foo bar'}},
    {tags: {$elemMatch: {
      tagname: {$startsWith: 'astro'},
      time: {$lt: null}
    }}},
    {$and: [
      {'tags.tag_name': 'good'},
      {$not: {'tags.time': {$lt: '2018'}}},
    ]},
    {'tags.tag_name':{$in:['foo', 'bar', 'a\'b']}},
    'halftype',
  ]})
  sameD([
    todo
  ], todoObj)
	t.pass()
})

export default {todo, todoObj}
