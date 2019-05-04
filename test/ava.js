import test from 'ava'
import path from 'path'
import {SyntaxError, parse, Tracer} from '../index.js'
import _date from '../filter-date.js'
let {parse: DateFilter} = _date
import _number from '../filter-number.js'
let {parse: NumberFilter} = _number
import _mongodb_date from '../filter-date-mongodb.js'
let {parse: MongodbDateFilter} = _mongodb_date
const {DateTime} = require('luxon')
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

let localTracer = function () {
  this.level = 0
}
localTracer.prototype.formatInt = function (int, width) {
  let rawint = int
  let digit
  if (!int) {
    digit = 1
  } else {
    digit = 0
    while (int >= 1) {
      int = int / 10
      digit += 1
    }
  }
  if (digit >= width) {
    return String(rawint)
  } else {
    return " ".repeat(width - digit) + String(rawint)
  }
}
localTracer.prototype.trace = function (event) {
  let {type, rule, location, result} = event
  let action
  if (type === 'rule.enter') {
    action = type
  } else if (type === 'rule.match') {
    this.level -= 1
    action = type
  } else if (type === 'rule.fail') {
    this.level -= 1
    action = type + ' '
  }
  let start = location.start.offset
  let end = location.end.offset
  let sStr = this.formatInt(start, 3)
  let eStr = this.formatInt(end, 3)
  if (result !== undefined) {
    let rstr
    try {
      rstr = JSON.stringify(result)
    } catch (e) {
      rstr = String(result)
    }
    console.log(`${sStr}-${eStr} ${this.level} ${action} ${" ".repeat(this.level*2)} ${rule} ====> ${rstr}`)
  } else {
    console.log(`${sStr}-${eStr} ${this.level} ${action} ${" ".repeat(this.level*2)} ${rule}`)
  }
  if (type === 'rule.enter') {
    this.level += 1
  }
}

let blankTracer = function () {}
blankTracer.prototype.trace = function (event) {}

let todo, todoObj
todo = `
  title|startsWith: 'foo bar' ||
  tags|elemMatch:{tagname|startsWith: astro, time|lt: } ||
  tags.tag_name: 'good' && (tags.time|lt: '2018') ||
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
    {'tags.time': {$lt: '2018'}},
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
      t.deepEqual(result, value, JSON.stringify({each, result, value}))
      result = parse(" "+each, {tracer:blanktracer})
      t.deepEqual(result, value, JSON.stringify({each, result, value}))
      result = parse(each+" ", {tracer:blanktracer})
      t.deepEqual(result, value, JSON.stringify({each, result, value}))
      result = parse(" "+each+" ", {tracer:blanktracer})
      t.deepEqual(result, value, JSON.stringify({each, result, value}))
    }
  }
  // numbers
  let numbers = [
    0, '-0', 1, 11, -12, 121.223, -121.223, 131e1, -131e1, 123.123e-1, -123.123e-1
  ]
  for (let each of numbers) {
    result = parse(String(each), {tracer: blanktracer})
    if (!result.$and) debugger
    t.is(Number(each), result.$and[0])
    result = parse(" "+String(each), {tracer: blanktracer})
    t.is(Number(each), result.$and[0])
    result = parse(String(each)+" ", {tracer: blanktracer})
    t.is(Number(each), result.$and[0])
    result = parse(" "+String(each)+" ", {tracer: blanktracer})
    t.is(Number(each), result.$and[0])
  }
  // strings
  sameD(['hehehe', `'hehehe'`, `"hehehe"`], {$and: ['hehehe']})
  sameD([`'he\thehe'`, `"he\thehe"`], {$and: ['he\thehe']})
  sameD([`'he\\\\hehe'`, `"he\\\\hehe"`], {$and: ['he\\hehe']})
  sameD([`'2018-01-01T00:00:00'`, `"2018-01-01T00:00:00"`], {$and: ['2018-01-01T00:00:00']})
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
    `$good|in:good`,
    `$good|in  :  good`,
    `'$good'|in  :  good`,
    `'$good'|in  :  'good'`,
    `$good|in  :  'good'`,
  ], {$good: {$in: "good"}})
  sameD([
    `$good|in:`,
    `$good|in  :  `,
    `'$good'|in  :  `,
    `'$good'|in  :  `,
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
  //let cursors = range(0, 581)
  //parse.debug(todo, cursors)
  sameD([
    `title|startsWith: 'foo bar' || tags|elemMatch:{tagname|startsWith: astro, time|lt: } || tags.tag_name: 'good' && (tags.time|lt: '2018') || tags.tag_name|in:[foo, bar, 'a\\'b'] || halftype`,
  ], {$or: [
    {title: {$startsWith: 'foo bar'}},
    {tags: {$elemMatch: {
      tagname: {$startsWith: 'astro'},
      time: {$lt: null}
    }}},
    {$and: [
      {'tags.tag_name': 'good'},
      {'tags.time': {$lt: '2018'}},
    ]},
    {'tags.tag_name':{$in:['foo', 'bar', 'a\'b']}},
    'halftype',
  ]})
  sameD([
    todo
  ], todoObj)
	t.pass()
})
test('test number filter', t => {
  let parse = NumberFilter
  let func, vfunc
  function testFunction (str, tests, rawvalue) {
    let tracer = new blankTracer()
    let {value, filter} = parse(str, {tracer})
    if (rawvalue) {
      t.is(value, rawvalue)
    }
    for (let eachtest of tests) {
      t.is(filter(eachtest[0]), eachtest[1], eachtest)
    }
  }
  testFunction(`2342.234`, [ ], 2342.234)
  testFunction(`'let absv = Math.abs(v); absv >= 30'`, [
    [-30, true], [-31, true], [0, false]
  ])
  testFunction(`'let absv = Math.abs(v); absv >= 30' 23333`, [
    [-30, true], [-31, true], [0, false]
  ], 23333)
  testFunction(`>233`, [ [232, false], [233, false], [234, true] ])
  testFunction(`>233 <=1e3`, [
    [232, false], [233, false], [234, true],
    [999, true], [1000, true], [1001, false],
  ])
  testFunction(`>2333 <=1e3`, [
    [232, false], [233, false], [234, false],
    [999, false], [1000, false], [1001, false],
  ])
  testFunction(`>233 <=1e3 || >=2000 && <3000.123 90.0`, [
    [232, false], [233, false], [234, true],
    [999, true], [1000, true], [1001, false],
    [1999, false], [2000, true], [2001, true],
    [3000, true], [3001, false],
  ], 90.0)
  testFunction(`>233 <=1e3 || ~(<2000 || >=3000.123) 90.`, [
    [232, false], [233, false], [234, true],
    [999, true], [1000, true], [1001, false],
    [1999, false], [2000, true], [2001, true],
    [3000, true], [3001, false],
  ], 90.0)
  testFunction(`>233 <=1e3 || ~(<2000 || ~<3000.123) 23333.`, [
    [232, false], [233, false], [234, true],
    [999, true], [1000, true], [1001, false],
    [1999, false], [2000, true], [2001, true],
    [3000, true], [3001, false],
  ], 23333.)
})
test('test date filter', t => {
  let parse = DateFilter
  function testFunction (str, tests, rawvalue) {
    let tracer = new blankTracer()
    // let tracer = new Tracer({content: str, logSimple: true})
    let {value, filter} = parse(str, {tracer})
    if (rawvalue) {
      t.is(value, rawvalue)
    }
    for (let eachtest of tests) {
      t.is(filter(eachtest[0]), eachtest[1], `filterStr: ${str}, toTest:${eachtest[0]}, shouldBe:${eachtest[1]}`)
      // if (filter(eachtest[0]) !== eachtest[1]) debugger
    }
  }
  testFunction(`2018`,[ ], '2018')
  testFunction(`2018-10`,[ ], '2018-10')
  testFunction(`2018-10-10`,[ ], '2018-10-10')
  testFunction(`2018-10-10T12:32:21.123+08:00`,[ ], '2018-10-10T12:32:21.123+08:00')
  testFunction(`T12`,[ ], 'T12')
  testFunction(`12:`,[ ], '12:')
  testFunction(`12:30`,[ ], '12:30')
  testFunction(`>2008-10-10T12:00:00`,[
    ['20081010', false], ['20081010T12', false], ['20081010T12:01', true],
  ])
  testFunction(`>=2008-10-10T12:00:00`,[
    ['20081010', false], ['20081010T12', true], ['20081010T12:01', true],
  ])
  testFunction(`<2008-10-10T12:00:00`,[
    ['20081010', true], ['20081010T12', false], ['20081010T12:01', false],
  ])
  testFunction(`<=2008-10-10T12:00:00`,[
    ['20081010', true], ['20081010T12', true], ['20081010T12:01', false],
    ['20081010T04:00:00Z', true], ['20081010T04:01:00Z', false],
    [new Date('2008-10-10T04:00:00Z'), true], [new Date('2008-10-10T04:01:00Z'), false],
  ])
  testFunction(`>=2008-10-10T12 <2008-10-11 || >=2008-05-10T12 <2008-05-11 || ~(<2009 || >2010) 2019`,[
    ['20081011', false], ['20081010T20', true], ['20081010T12', true], ['20081010T11', false],
    ['20080511', false], ['20080510T20', true], ['20080510T12', true], ['20080510T11', false],
    ['2009', true], ['2010', true], ['200812', false], ['20100102', false]
  ], '2019')
  testFunction(`
    in:year:2000 ||
    (in:2001 in:month:03) ||
    (in:2002 in:day:29) ||
    (in:2004 in:02-29) ||
    (in:2019 in:weekday:3) ||
    (in:2019-01 >=weekday:3 <weekday:5) ||
    in:2008-08-08 ||
    in:2010-10 ||
    in:201012 ||
    (>06-06 <06-11)
    2019
    `,[
    ['200006', true], ['199906', false],// in:year:2000
    ['20010305', true], ['20010205', false], ['20010405', false], // in:month:03
    ['20020328', false], ['20020329', true], ['20020330', false], // in:day:29
    ['20040228', false], ['20040229', true], ['20020301', false], // in:02-29
    ['20190430', false], ['20190501', true], ['20190502', false], // in:weekday:3
    ['20190101', false], ['20190102', true], ['20190103', true], ['20190104', false], // >=weekday:3 <weekday:5
    ['20080807T12', false], ['20080808T12', true], ['20080809', false],  // in:2009-08-08
    ['20100931T12', false], ['20101001', true], ['20101031T23:59:59.99', true], ['20101101', false], // in:2010-10
    ['20101130T12', false], ['20101201', true], ['20101231T23:59:59.99', true], ['2011', false], // in:201012
    ['20150606', false], ['20150607', true], ['20150610T23:59:59', true], ['20150611T00:00:00', false], // >06-06 <06-10
  ], '2019')

  testFunction(`
    (in:2000 >=10 <18) ||
    (in:2001 (>10:00 <18:30) || (>03:00 <05:00))
    2019
    `,[
    ['20000601T09:59', false], ['20000601T10:00', true], ['20000601T18:00', false],
    ['20010601T10:00', false], ['20010601T11:59', true], ['20010601T18:29', true], ['20010601T18:30', false],
    ['20010601T03:00', false], ['20010601T03:01', true], ['20010601T04:59', true],  ['20010601T05:00', false],
  ], '2019')
  let now = DateTime.local()
  let m1h  = now.minus({hour:1})
  let m5h  = now.minus({hour:5})
  let m10h = now.minus({hour:10})
  let m1m  = now.minus({month:1})
  let m5m  = now.minus({month:5})
  let m10m = now.minus({month:10})
  testFunction(`
    >-6h <-2h ||
    >-6M <-2M
    `,[
    [m1h.toISO(), false],
    [m5h.toISO(), true],
    [m10h.toISO(), false],
    [m1m.toISO(), false],
    [m5m.toISO(), true],
    [m10m.toISO(), false],
  ])


  t.pass()
})
test.only('test date filter-mongodb syntax', t => {
  let parse = MongodbDateFilter
  let date = "$$date"
  let input = {$dateToString: {date}}
  let timezone = DateTime.local().zone.name
  let blanktracer = {}
  blanktracer.trace = _ => {}
  function sameD (todo, _filter, _value) {
    let result
    result = parse(todo, {tracer:blanktracer})
    let {filter, value} = result
    if (filter) {
      t.deepEqual(_filter, filter, JSON.stringify({todo, _filter, filter}))
    }
    if (_value !== undefined) {
      t.is(_value, value)
    }
  }
  function D(str) {
    return DateTime.fromISO(str).toUTC().toISO()
  }
  function T(str) {
    return DateTime.fromISO(str).toUTC().toISOTime()
  }
  function E(str, unit) {
    return DateTime.fromISO(str).endOf(unit).toUTC().toISO()
  }
  sameD(`2018`,[ ], '2018')
  sameD(`2018-10`,[ ], '2018-10')
  sameD(`2018-10-10`,[ ], '2018-10-10')
  sameD(`2018-10-10T12:32:21.123+08:00`,[ ], '2018-10-10T12:32:21.123+08:00')
  sameD(`T12`,[ ], 'T12')
  sameD(`12:`,[ ], '12:')
  sameD(`12:30`,[ ], '12:30')
  sameD(`>2008-10-10T12:00:00`,{$gt: [input, D('2008-10-10T12:00:00')]})
  sameD(`>=2008-10-10T12:00:00`,{$gte: [input, D('2008-10-10T12:00:00')]})
  sameD(`<2008-10-10T12:00:00`,{$lt: [input, D('2008-10-10T12:00:00')]})
  sameD(`<=2008-10-10T12:00:00`,{$lte: [input, D('2008-10-10T12:00:00')]})
  sameD(`>=2008-10-10T12 <2008-10-11 || >=2008-05-10T12 <2008-05-11 || ~(<2009 || >2010) 2019`,
    {$or:[
      {$and:[{$gte:[input, D('2008-10-10T12')]}, {$lt:[input, D('2008-10-11')]}]},
      {$and:[{$gte:[input, D('2008-05-10T12')]}, {$lt:[input, D('2008-05-11')]}]},
      {$not:[{$or:[
          {$lt:[input, D('2009')]}, {$gt:[input, D('2010')]}
      ]}]}
    ]},
    '2019')
  sameD(`
    in:year:2000 ||
    (in:2001 in:month:03) ||
    (in:2002 in:day:29) ||
    (in:2004 in:02-29) ||
    (in:2019 in:weekday:3) ||
    (in:2019-01 >=weekday:3 <weekday:5) ||
    in:2008-08-08 ||
    in:2010-10 ||
    in:201012 ||
    (>06-06 <06-11)
    2019
    `,{$or:[
        {$and: [{$gte:[input, D('2000')]}, {$lte:[input, E('2000', 'year')]}]},
        {$and: [
          {$and: [{$gte:[input, D('2001')]}, {$lte:[input, E('2001', 'year')]}]},
          {$eq:[{$month:{date, timezone}}, 3 ]}
        ]},
        {$and: [
          {$and: [{$gte:[input, D('2002')]}, {$lte:[input, E('2002', 'year')]}]},
          {$eq:[{$day:{date, timezone}}, 29 ]}
        ]},
        {$and: [
          {$and: [{$gte:[input, D('2004')]}, {$lte:[input, E('2004', 'year')]}]},
          {$and: [
            {$eq:[{$month:{date, timezone}}, 2 ]},
            {$eq:[{$day:{date, timezone}}, 29 ]},
          ]}
        ]},
        {$and: [
          {$and: [{$gte:[input, D('2019')]}, {$lte:[input, E('2019', 'year')]}]},
          {$eq:[{$dayOfWeek:{date, timezone}}, 3 ]}
        ]},
        {$and: [
          {$and: [{$gte:[input, D('2019-01')]}, {$lte:[input, E('2019-01', 'month')]}]},
          {$gte:[{$dayOfWeek:{date, timezone}}, 3 ]},
          {$lt:[{$dayOfWeek:{date, timezone}}, 5 ]},
        ]},
        {$and: [
          {$gte:[input, D('2008-08-08')]},
          {$lte:[input, E('2008-08-08', 'day')]},
        ]},
        {$and: [
          {$gte:[input, D('2010-10')]},
          {$lte:[input, E('2010-10', 'month')]},
        ]},
        {$and: [
          {$gte:[input, D('2010-12')]},
          {$lte:[input, E('2010-12', 'month')]},
        ]},
        {$and: [
          {$and: [
            {$gte: [{$month:{date, timezone}}, 6]},
            {$gt: [{$day:{date, timezone}}, 6]},
          ]},
          {$and: [
            {$lte: [{$month:{date, timezone}}, 6]},
            {$lt: [{$day:{date, timezone}}, 11]},
          ]}
        ]}
    ]}, '2019')
  let tinput = {$dateToString: {date, format:"%H:%M:%S.%LZ"}}
  sameD(`
    (in:2018 >=10 <18) ||
    (in:2019 (>10:00 <18:30) || (>03:00 <05:00))
    2019
    `,{$or:[
        {$and: [
          {$and: [{$gte:[input, D('2018')]}, {$lte:[input, E('2018', 'year')]}]},
          {$gte: [tinput, T('10')]},
          {$lt: [tinput, T('18')]},
        ]},
        {$or:[
          {$and:[
            {$and: [{$gte:[input, D('2019')]}, {$lte:[input, E('2019', 'year')]}]},
            {$and:[
              {$gt: [tinput, T('10:00')]},
              {$lt: [tinput, T('18:30')]},
            ]},
          ]},
          {$and: [
            {$gt: [tinput, T('03:00')]},
            {$lt: [tinput, T('05:00')]},
          ]},
        ]}
    ]}, '2019')
  let result = parse(`
    (in:2018 >=10 <18) ||
    (in:2019 (>10:00 <18:30) || (>03:00 <05:00)) ||
    (>-3m <+3m >00:00 <01:00)
    2019
    `, {tracer:blanktracer})
  //console.log(JSON.stringify(result, null, 2))
  t.pass()
  return
})

export default {todo, todoObj}
