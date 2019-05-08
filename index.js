const path = require('path')
let {SyntaxError, parse} = require('./mongodb-simple-query-syntax.js')
let {parse: NumberParser} = require('./filter-number.js')
let {parse: DateParser} = require('./filter-date.js')
let {parse: MongodbDateParser} = require('./filter-date-mongodb.js')
const {DateTime} = require('luxon')

// general operations
const OP_expr = { // expr means Expr or fields or value
  description:'expr', type:'Expr',
  fields: {
    $and: { description:"and", type:'Expr', array:true},
    $or: { description:"or", type:'Expr', array:true},
    $not: { description:"not", type:'Expr'},
    $eq: { description:"==", type:'expr', array:true},
    $lt: { description:"<", type:'expr', array:true},
    $gt: { description:">", type:'expr', array:true},
    $lte: { description:"<=", type:'expr', array:true},
    $gte: { description:">=", type:'expr', array:true},
    $ne: { description:"!=", type:'expr', array:true},
    $cond: { description:"cond", type:'cond',
      fields: {
        if: { description:"if", type:'Expr'},
        then: { description:"then", type:'Expr'},
        else: { description:"else", type:'Expr'},
      }
    },
    $abs: { description:"abs", type:'fields'},
    $hour: { description:"hour", type:'fields'},
    $minute: { description:"minute", type:'fields'},
    $day: { description:"day", type:'fields'},
    $month: { description:"month", type:'fields'},
    $year: { description:"year", type:'fields'},
  }
}
const OP_ROOT = {
  description: 'operation for root level',
  fields: {
    $expr: OP_expr,
    $where: {
      description: 'where', type:'String',
    },
    $text: {
      description: 'text', type: 'object',
      fields: {
        $search: {
          description: 'search', type: 'String',
        }
      }
    },
    $unwind: {
      description: 'unwind', type: 'fields',
    },
    $addFields: {
      description: 'addFields', type: 'addFields'
    }
  }
}
const OP_string = {
  description: 'operations for string',
  type: 'string',
  fields: {
    $lt: { description:"<", type:'String' },
    $gt: { description:">", type:'String' },
    $lte: { description:"<=", type:'String' },
    $gte: { description:">=", type:'String' },
    $ne: { description:"!=", type:'String' },
    $in: { description:'in', type: 'String', array: true },
    $nin: { description:'nin', type: 'string', array: true },
  }
}
const OP_number = {
  description: 'operations for number',
  type: 'number',
  fields: {
    $lt: { description:"<", type:'number' },
    $gt: { description:">", type:'number' },
    $lte: { description:"<=", type:'number' },
    $gte: { description:">=", type:'number' },
    $ne: { description:"!=", type:'number' },
    $in: { description:'in', type: 'number', array: true },
    $nin: { description:'nin', type: 'number', array: true },
  }
}
const OP_date = {
  description: 'operations for date',
  type: 'date',
  fields: {
    $lt: { description:"<", type:'date' },
    $gt: { description:">", type:'date' },
    $lte: { description:"<=", type:'date' },
    $gte: { description:">=", type:'date' },
  }
}
const OP_array_object = {
  description: 'operations for array_object',
  fields: {
    $el: { description:'elemMatch', type: 'object' },
    $elemMatch: { description:'elemMatch', type: 'object' },
  }
}
const OP_array = {
  description: 'operations for date',
  fields: {
    $lt: { description:"<", type:'unknown' },
    $gt: { description:">", type:'unknown' },
    $lte: { description:"<=", type:'unknown' },
    $gte: { description:">=", type:'unknown' },
    $ne: { description:">=", type:'unknown' },
    $in: { description:'in', type: 'unknown', array: true },
    $nin: { description:'nin', type: 'unknown', array: true },
    $el: { description:'elemMatch', type: 'object' },
    $elemMatch: { description:'elemMatch', type: 'object' },
  }
}
const OP_array_number = JSON.parse(JSON.stringify(OP_array,
  function (key, value) { if(key==='type' && value==='unknown') {return 'number'} else {return value} })
)
const OP_array_date = JSON.parse(JSON.stringify(OP_array,
  function (key, value) { if(key==='type' && value==='unknown') {return 'date'} else {return value} })
)
const OP_array_string = JSON.parse(JSON.stringify(OP_array,
  function (key, value) { if(key==='type' && value==='unknown') {return 'string'} else {return value} })
)

/*
TODO:
  * support reg
  * add =><+- into simpleString
  * make a daterange parser
  * make a date parser
  * backend
    * pinyin plugin
    * lm query
*/

/*
* stringField non match
  * query primary keys and do lm
* string:
  stringField
    => stringField|reg,in,nin,lt,gt,lte,gte
  stringValue:
    if null:
      'string or regex'
    if string or simpleString
      => lm method
    if reg:
      reg filter
* number:
  numberField:
    => numberField|lt,gt,lte,gte,eq,ne,in,nin
  numberValue:
    if null:
      'number or filter'
    if number:
      => lm method
    if simpleString
      apply filter, sort, and lm method
* date:
  dateField:
    => dateField|lt,gt,lte,gte
  dateValue:
    if null:
      'date or filter'
    do date parse
      return a date
        lm method
      return a function:
        do filter
          lm method
* bool:
    boolField
    voolValue:
      true
      false

* unknown:
    no auto complete

* array_number,string,date:
    field:
      => field|lt,gt,lte,gte,elemMatch, field:{}
    field|elemMatch
      => field|elemMatch|,lt,gt,lte,gte,or,and, field|elemMatch:{}

    in object:
      subfield,

    value and value inside {}:like the single value
* array of unknown
    field:
      => field|lt,gt,lte,gte,elemMatch, field:{}
    value:
      no auto complete
* object:
    objectField:
      => objectField.subfields
      => => ....
    objectValue:
* array of object
    arrayField:
      => arrayField.objectFields


*/

class ParseError extends Error {
  constructor (start, end, expected, before, after) {
    super(`Parse error:\nbefore:\n${before}\nafter:\n${after}\nexpected:${JSON.stringify(expected)}`)
    this.start = start
    this.end = end
    this.expected = expected
    this.before = before
    this.after = after
  }
}
function replacer(key, value) {
  if (value instanceof RegExp) {
    return ("__REGEXP " + value.toString())
  } else if (value instanceof Date) {
    return ("__DATE " + value.toString())
  } else {
    return value
  }
}
function reviver(key, value) {
  if (value.toString().indexOf("__REGEXP ") == 0) {
    var m = value.split("__REGEXP ")[1].match(/\/(.*)\/(.*)?/)
    return new RegExp(m[1], m[2] || "")
  } else if (value.toString().indexOf("__DATE ") == 0) {
    var m = value.split("__DATE ")[1]
    return new Date(m)
  } else {
    return value
  }
}
let JSONEX = {
  stringify (obj) {
    return JSON.stringify(obj, replacer)
  },
  parse (str) {
    return JSON.parse(obj, reviver)
  },
}
//console.log(JSON.parse(JSON.stringify(o, replacer, 2), reviver));

let demoStruct = {
  description: 'root fields',
  type: 'key',
  fields: {
    $not: { description:'&&', type: 'object', array: true },
    $and: { description:'~', type: 'object', array: true },
    $or: { description:'||', type: 'object', array: true },
    string: { description:'string', type:'string' },
    number: { description:'number', type:'number' },
    date: { description:'date', type:'date' },
    bool: { description:'bool', type:'bool' },
    array_number: { description: '[number]', array: true, type:'number'},
    array_string: { description: '[string]', array: true, type:'string'},
    array_date: { description: '[date]', array: true, type:'date'},
    array_unknown: { description:'[?]', array: true },
    array_object_unknown: { description:'[{?}]', array: true, type:'object' },
    object_unknown: { description:'{?}', type:'object' },
    object: {
      description:'{...}',
      type:'object' ,
      fields: {
        string: { description:'{string}', type:'string' },
        number: { description:'{number}', type:'number' },
        date: { description:'{date}', type:'date' },
        array_number: { description: '{[number]}', array: true, type:'number'},
        array_string: { description: '{[string]}', array: true, type:'string'},
        array_date: { description: '{[date]}', array: true, type:'date'},
        array_unknown: { description:'{[?]}', array: true },
        array_object_unknown: { description:'{[{?}]}', array: true, type:'object' },
        object_unknown: { description:'{{?}}', type:'object' },
        object: {
          description:'{{...}}',
          type:'object' ,
          fields: {
            string: { description:'{{string}}', type:'string' },
            number: { description:'{{number}}', type:'number' },
            date: { description:'{{date}}', type:'date' },
            array_number: { description: '{{[number]}}', array: true, type:'number'},
            array_string: { description: '{{[string]}}', array: true, type:'string'},
            array_date: { description: '{{[date]}}', array: true, type:'date'},
            array_unknown: { description:'{{[?]}}', array: true },
            array_object_unknown: { description:'{{[{?}]}}', array: true, type:'object' },
            object_unknown: { description:'{{{?}}}', type:'object' },
          }
        },
        array: {
          description:'{[{...}]}',
          array: true,
          type: 'object',
          fields: {
            string: { description:'{[{string}]}', type:'string' },
            number: { description:'{[{number}]}', type:'number' },
            date: { description:'{[{date}]}', type:'date' },
            array_number: { description: '{[{[number]}]}', array: true, type:'number'},
            array_string: { description: '{[{[string]}]}', array: true, type:'string'},
            array_date: { description: '{[{[date]}]}', array: true, type:'date'},
            array_unknown: { description:'{[[?]]}', array: true},
            array_object_unknown: { description:'{[[{?}]]}', array: true, type:'object' },
            object_unknown: { description:'{[{{?}}]}', type:'object' },
            object: {
              description:'{[{{...}}]}',
              type:'object' ,
              fields: {
                string: { description:'{[{{stirng}}]}', type:'string' },
                number: { description:'{[{{number}}]}', type:'number' },
                date: { description:'{[{{date}}]}', type:'date' },
                array_number: { description: '{[{{[number]}}]}', array: true, type:'number'},
                array_string: { description: '{[{{[string]}}]}', array: true, type:'string'},
                array_date: { description: '[{{[date]}}]', array: true, type:'date'},
                array_unknown: { description:'[{{[?]}}]', array: true,},
                array_object_unknown: { description:'[{{[{?}]}}]', array: true, type:'object' },
                object_unknown: { description:'{[{{[{?}]}}]}', type:'object' },
              }
            },
          }
        },
      }
    },
    array: {
      description:'[{...}]',
      array: true,
      type: 'object',
      fields: {
        string: { description:'[{string}]', type:'string' },
        number: { description:'[{number}]', type:'number' },
        date: { description:'[{date}]', type:'date' },
        array_number: { description: '[{[number]}]', array: true, type:'number'},
        array_string: { description: '[{[string]}]', array: true, type:'string'},
        array_date: { description: '[{[date]}]', array: true, type:'date'},
        array_unknown: { description:'[[?]]', array: true },
        array_object_unknown: { description:'[[{?}]]', array: true, type:'object' },
        object_unknown: { description:'[{{}}]', type:'object' },
        object: {
          description:'[{{...}}]',
          type:'object' ,
          fields: {
            string: { description:'[{{stirng}}]', type:'string' },
            number: { description:'[{{number}}]', type:'number' },
            date: { description:'[{{date}}]', type:'date' },
            array_number: { description: '[{{[number]}}]', array: true, type:'number'},
            array_string: { description: '[{{[string]}}]', array: true, type:'string'},
            array_date: { description: '[{{[date]}}]', array: true, type:'date'},
            array_unknown: { description: '[{{[?]}}]', array: true},
            array_object_unknown: { description: '[{{[{?}]}}]', array: true, type:'object'},
            object_unknown: { description:'[{{{?}}}]', type: 'object' },
          },
        },
      },
    },
  }
}

function Tracer ({content, logFull, logSimple, print}) {
  this.level = 0
  this.history = []
  this.logFull = logFull
  this.logSimple = logSimple
  this.print = print
  if (content === undefined) {
    throw Error('should give content')
  }
  this.content = content
}
Tracer.prototype.formatInt = function (int, width) {
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
Tracer.prototype.getAutocompleteType = function (cursor, log, detail, print) {
  let length = this.content.length
  if (cursor<0 || cursor > length) throw Error(`bad cursor position: should be within [0, ${length}]`)

  let related = this.traceInfo.filter(_ => _.location.start.offset<=cursor && _.location.end.offset>=cursor && _.result)
  let thisStruct = null
  let prefix, suffix
  let value
  let output

  let state
  let stateStack = []
  let parent = 'block'
  const structRules = ['PairComplete', 'PairMissValue', 'PairOnlyOP', 'PairOnlyKey', 'Key', 'ValuePair', 'ValueArray', 'ValueObject']
  const valueTypes = [ 'true', 'false', 'null', 'String', 'SimpleString', 'Number', 'RegularExpression' ]
  // get structure for this object
  for (let each of related) {
    let {rule:type, location, result} = each
    let start = location.start.offset
    let end = location.end.offset
    if (type === 'PairComplete') {
      stateStack.push({ type, start, end, result})
      state = type
    } else if (type === 'PairMissValue') {
      stateStack.push({ type, start, end, result})
      state = type
    } else if (type === 'PairOnlyOP') {
      stateStack.push({ type, start, end, result})
      state = type
    } else if (type === 'PairOnlyKey') {
      stateStack.push({ type, start, end, result})
      state = type
    } else if (type === 'Object') {
      stateStack.push({ type, start, end, result })
      state = type
    } else if (type === 'Array') {
      stateStack.push({ type, start, end, result })
      state = type
    } else if (type === 'ArrayWrapper') {
      stateStack.push({ type, start, end, result })
      state = type
    }
  }

  // get value, do immediately return for ws*
  for (let each of related.reverse()) {
    let {rule:type, location, result} = each
    let start = location.start.offset
    let end = location.end.offset
    if (!value) {
      if (valueTypes.includes(type)) {
        value = {
          type: each.rule,
          start, end,
          result: each.result,
          level: each.level,
        }
        if (type === "String") {
          value.quote = this.content[each.location.start.offset]
        }
        continue
      }
    }
    if (type === 'ws00' && (start<cursor && cursor<end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'key', subtype: 'fieldKey', complete: 'insert', extract:[], start: cursor, end:cursor}
      break
    } else if (type === 'ws01' && (start<cursor && cursor<=end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'key', subtype: 'fieldKey', complete: 'insert', extract:"", start: cursor, end:cursor}
      break
    } else if (type === 'ws10' && (start<=cursor && cursor<end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'key', subtype: 'fieldKey', complete: 'insert', extract:"", start: cursor, end:cursor}
      break
    } else if (type === 'ws10Object' && (start<=cursor && cursor<end)) {
      output = {type: 'key', subtype: 'objectKey', complete: 'insert', extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws01Object' && (start<cursor && cursor<=end)) {
      output = {type: 'key', subtype: 'objectKey', complete: 'insert', extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws10Array' && (start<=cursor && cursor<end)) {
      output = {type: 'value', subtype: 'arrayValue', complete: 'insert', extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws01Array' && (start<cursor && cursor<=end)) {
      output = {type: 'value', subtype: 'arrayValue', complete: 'insert', extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ValueBlock') {
      if (value.type === 'SimpleString') {
        if (value.result.indexOf('.')>=0) {

        }
      }
      output = {
        type: 'key',
        subtype: type,
        valueType: value.type,
        complete: 'replace',
        extract:String(value.result), // string
        start: value.start,
        end: value.end,
        value,
        stateStack,
      }
      break
    } else if (type === 'ValueObject') { // unfinished object
      output = {
        type: 'key',
        subtype: 'objectKey',
        valueType: value.type,
        complete: 'replace',
        extract:[String(value.result)], // string
        start: value.start,
        end: value.end,
        value,
        stateStack,
      }
      break
    } else if (type === 'ws01PS'&& (start<cursor && cursor<=end)) { // unfinished object
      output = { type: 'value', subtype: 'pairValueNull', complete: 'insert', extract:"", start: cursor, end: cursor, stateStack}
      break
    } else if (type === 'ValueArray') { // unfinished object
      if (!value) { // ctime:! ....
        break
      }
      output = {
        type: 'value',
        subtype: 'arrayValue',
        valueType: value.type,
        complete: 'replace',
        extract:String(value.result), // string
        start: value.start,
        end: value.end,
        value,
        stateStack,
      }
      break
    } else if (type === 'Key' || type === 'KeyOP' || type === 'KeyKey') { // no more level under key
      value = each
      let valueType = 'key'
      let keyString = this.content.slice(start, end+1)
      if (each.result.length !== keyString.split('|').length) {
        throw Error('should not be here, need debug')
      }
      let keyIndex = 0
      let lastEnd = 0
      for (let index=start+1; index<=cursor; index++) { // for operations
        if (this.content[index-1] === '|') {
          valueType = 'subop'
          keyIndex += 1
          lastEnd = index-1
        }
      }
      let rawExtract = each.result.slice(0, keyIndex+1)
      let extract
      if (rawExtract.length === 1) { // for subfields
        let subfields = rawExtract[0].split('.')
        if (subfields.length > 1) {
          keyIndex = 0
          lastEnd = 0
          for (let index=start+1; index<=cursor; index++) { // for operations
            if (this.content[index-1] === '.') {
              valueType = 'subfield'
              keyIndex += 1
              lastEnd = index-1
            }
          }
          let newExtract = subfields.slice(0, keyIndex+1)
          extract = [newExtract].concat(rawExtract.slice(1,))
        } else {
          extract = rawExtract
        }
      } else {
        if (rawExtract[0].indexOf('.')>=0) {
          extract = [rawExtract[0].split('.')].concat(rawExtract.slice(1,))
        } else {
          extract = rawExtract
        }
      }

      output = {
        type: 'key',
        subtype: type,
        valueType,
        complete: 'replace',
        extract, // array
        start,
        end,
        lastEnd, // when do replace, keep [start~lastStart], delete [lastStart+1 ~ end] and replace with autocomplete
        value,
        stateStack,
      }
      break
    } else if (type === 'ValuePair') { // no more level under key
      output = {
        type: 'value',
        subtype: 'pairValue',
        valueType: value.type,
        complete: 'replace',
        extract:String(value.result), // string
        start: value.start,
        end: value.end,
        value,
        stateStack,
      }
      break
    } else if (type === 'Object') {
      output = {
        type: 'edge',
        subtype: type,
        valueType: 'object',
        complete: null,
        start,
        end,
        value: each.result,
        stateStack,
      }
      break
    } else if (type === 'Array') {
      output = {
        type: 'edge',
        subtype: type,
        valueType: 'array',
        complete: null,
        start,
        end,
        value: each.result,
        stateStack,
      }
      break
    }
  }

  let newContent = `${this.content.slice(0,cursor)}◼️${this.content.slice(cursor)}`
  if (output) {
    let {type, start, end, complete} = output
    output.related = related
    if (complete === 'insert') {
      if (log) {// colorful log in console
        console.log(`===========cursor position: ${cursor}===========`)
        let toPrint = `${this.content.slice(0,cursor)}%c◼️%c${this.content.slice(cursor)}`
        console.log(JSON.stringify(output))
        console.log(toPrint, "color:red;", "")
      }
      if (print) {
        output.print = {
          head: this.content.slice(0,cursor),
          middle: '◼️',
          tail: this.content.slice(cursor),
        }
      }
    } else { // complete = replace
      if (log||print) {
        if (cursor < start) start += 1
        if (cursor < end) end += 1
        let head = newContent.slice(0, start)
        let middle = newContent.slice(start, end+1)
        let tail = newContent.slice(end+1,)
        if (log) {
          console.log(`===========cursor position: ${cursor}===========`)
          let toPrint =  `${head}%c${middle}%c${tail}`
          console.log(JSON.stringify(output))
          console.log(toPrint, "background-color:#41ff418c;", "")
        }
        if (print) {
          output.print = { head, middle, tail }
        }
        if (type==='key') {
          let {type, start, lastEnd: end, complete} = output
          if (cursor < start) start += 1
          if (cursor < end) end += 1
          let head = newContent.slice(0, start)
          let middle = newContent.slice(start, end+1)
          let tail = newContent.slice(end+1,)
          if (middle) {
            if (log) {
              let toPrint =  `${head}%c${middle}%c${tail}`
              console.log(toPrint, "background-color:#41ff418c;", "")
            }
            if (print) {
              output.printKey = { head, middle, tail }
            }
          } else {
            if (log) {
              console.log(newContent)
            }
            if (print) {
              output.printKey = newContent
            }
          }
        }
      }
    }
    //if (log && output.type === 'edge') {
    //  for (let each of related) {
    //    this.retrace(each)
    //  }
    //}
  } else {
    output = {type: null, print: newContent}
    if (print) {
      output.print = newContent
    }
    if (log) {
      console.log(newContent)
    }
  }
  if (detail) {
    for (let each of related) {
      this.retrace(each)
    }
  }
  output.cursor = cursor
  return output
}
Tracer.prototype.traceback = function () {
  // record the successful trace tree
  let stack = []
  let topObj
  this.traceInfo = []
  const stopRules = [
    'ws10', 'ws01', 'ws00', 'Key', 'String', 'SimpleString',
    'ws01Object', 'ws10Object', 'ws01Array', 'ws10Array',
    'ws01PS',
  ]
  let stop = false
  let failed = false
  let slevel = 0
  for (let each of this.history.reverse()) {
    let {type, rule, location, result, level} = each
    if (type === 'rule.match') {
      if (stop || failed) continue
      if (stopRules.includes(rule)) {
        stop = true
        slevel = level
      }
      stack.push(each)
    } else if (type === 'rule.fail') {
      if (stop || failed) continue
      failed = true
      slevel = level
    } else if (type === 'rule.enter') {
      if (stop || failed) {
        if (slevel === level) {
          if (failed) {
            failed = false
          } else if (stop) {
            stop = false
            topObj = stack.pop()
            this.traceInfo.push(topObj)
          }
        }
      } else {
        topObj = stack.pop()
        this.traceInfo.push(topObj)
      }
    }
  }
  this.traceInfo = this.traceInfo.reverse()
}
Tracer.prototype.retrace = function (event) {
  let {type, rule, location, result, level} = event
  let action
  if (type === 'rule.enter') {
    action = type
  } else if (type === 'rule.match') {
    action = type
  } else if (type === 'rule.fail') {
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
    console.log(`${sStr}-${eStr} ${level} ${action} ${" ".repeat(level*2)} ${rule} ====> ${rstr}`)
  } else {
    console.log(`${sStr}-${eStr} ${level} ${action} ${" ".repeat(level*2)} ${rule}`)
  }
}
Tracer.prototype.trace = function (event) {
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
  this.history.push(Object.assign({}, event, {level: this.level}))
  if (this.logFull) {
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
  }
  if (type === 'rule.enter') {
    this.level += 1
  }
  if (rule === 'start' && type === 'rule.match') {
    this.traceback()
    if (this.logSimple) {
      console.log('===============trace tree================')
      for (let each of this.traceInfo) {
        this.retrace(each)
      }
    }
  }
}

const OPDict = {
  logical: ['$and','$or'],
  root: ['$expr','$where','$text','$unwind','$addFields'],
  expr: Object.keys(OP_expr.fields),
  string: Object.keys(OP_string.fields),
  number: Object.keys(OP_number.fields),
  date: Object.keys(OP_date.fields),
  array_string: Object.keys(OP_array_string.fields),
  array_number: Object.keys(OP_array_number.fields),
  array_date:   Object.keys(OP_array_date.fields),
  array_object:   Object.keys(OP_array_object.fields),
}
function Parser({struct, options} = {}) {
  this.struct = struct
  if (this.struct) {
    this.fields = Object.keys(this.struct.fields)
  }
  this.options = options || {}
}
Parser.prototype.parse = function ({content, cursor}) {
  let logSimple = this.options.logSimple
  let logFull = this.options.logFull
  let print = this.options.print
  let tracer = new Tracer({content, logSimple, logFull, print})
  this.tracer = tracer
  let result
  try {
    result = parse(content, {tracer})
  } catch (e) {
    if (e instanceof SyntaxError) {
      let start = e.location.start.offset
      let end   = e.location.end.offset
      let expected = e.expected
      let before = content.slice(0, start)
      let after = content.slice(start)
      let error = new ParseError(start, end, expected, before, after)
      throw error
    } else {
      throw e
    }
  }
  this.result = result
  if (cursor !== undefined) {
    analysis = tracer.getAutocompleteType(cursor, log, detail, print)
    autocomplete = this.autocomplete(analysis)
    return {result, analysis, autocomplete}
  } else {
    return result
  }
}
Parser.prototype.analysis = function (cursor) {
  if (this.result === undefined) throw Error('should do parse before this')
  let log = this.options.log
  let detail = this.options.detail
  let print = this.options.print
  let result = this.result
  let analysis = this.tracer.getAutocompleteType(cursor, log, detail, print)
  let autocomplete = this.autocomplete(analysis)
  return {result, analysis, autocomplete}
}

function getTypeStruct(key, type) {
  let ops
  if (type === 'string') { // can have string or regexp
    ops = OP_string
  } else if (type === 'String') { // can only be String
    return null
  } else if (type === 'number') {
    ops = OP_number
  } else if (type === 'date') {
    ops = OP_date
  } else if (type === 'expr') {
    ops = OP_expr
  } else if (type === 'Expr') {
    ops = OP_expr
  } else if (type === 'addFields') {
    return {description: 'addFields', type:'fieldObject'}
  } else if (type === 'fieldObject') {
    return {description: 'fieldObject', type:'fields'}
  }
  if (key in ops.fields) {
    return ops.fields[key]
  } else {
    return null
  }
}
function getSubStruct (key, current_struct, path) {
  const levelKeys = ['$el', '$elemMatch', '$and', '$or', '$not']
  let {type, array} = current_struct
  if (current_struct.fields && key in current_struct.fields) {
    return current_struct.fields[key]
  } else { // get current_struct based on type and array
    if (current_struct.root) { // special ops for root
      if (key in OP_ROOT.fields) {
        return OP_ROOT.fields[key]
      }
    }
    if (array) {
      if (key === '$len') {
        return OP_number
      }
      if (type === 'object') {
        if (key.startsWith('$')) { // e.g., tags|in: [...], tags: {$gt: ...}
          if (levelKeys.includes(key)) {
            return current_struct
          } else if (current_struct.primary_key) {
            return current_struct.fields[current_struct.primary_key]
          } else {
            return null
          }
        } else {
          if (current_struct.fields) {
            return current_struct.fields[key]
          } else {
            return null
          }
        }
      } else { // array of values
        return getTypeStruct(key, type)
      }
    } else {
      if (type === 'object') {
        if (levelKeys.includes(key)) {
          return current_struct
        } else {
          return null
        }
      } else {
        return getTypeStruct(key, type)
      }
    }
  }
}
function getStruct(struct, path) {
  let current_struct = struct
  let current_root = struct
  let {root} = struct
  for (let each of path) {
    if (typeof(each) === 'number') { continue }
    if (each.indexOf('.')>-1) { // go into subsub field
      if (root) root = false
      for (let key of each.split('.')) {
        current_struct = getSubStruct(key, current_struct, path)
        if (!current_struct) { return {struct:null} } // can not parse struct
        // metadatas.value is special
        if (current_struct.type === 'object' && current_struct.path !== 'metadatas.value') current_root = current_struct
      }
    } else {
      if (!root || (root &&!(each === "$and" || each === "$or"))) {
        if (root) root = false
        current_struct = getSubStruct(each, current_struct, path)
        if (!current_struct) { return {struct:null} } // can not parse struct
        if (current_struct.type === 'object' && current_struct.path !== 'metadatas.value') current_root = current_struct
      } // else level not change
    }
  }
  return {struct:current_struct, root:current_root}
}
// TODO: change ctime, mtime, mctime, mmtime for api
// compile dict parsed from Tracer to a valid mongodb query
Parser.prototype.compile = function (input, parent, key, path, level, state) {
  let result = {}
  let error = []
  if (!state) state = {
    lastAnd: null,  // process text search
    arrayLength: [], // process |lenth for top-level arrays
    el: [], // process |lenth for top-level arrays
    date: [], // support date in the first level
    unwindCount: 0,
    addFieldsCount: 0,
    textCount: false, // debug text search
  }
  if (!level) level = 0
  const levelKeys = ['$and','$or','$not']
  if (!path) path = []
  if (Array.isArray(input)) {
    result = []
    input.forEach((_,index) => {
      let newpath = [...path, index]
      let sub = this.compile(_, result, index, newpath, level, state)
      if (sub.error) {
        error = [...error, ...sub.error]
      }
      result.push(sub.result)
    })
    return {result, error}
  } else if (input === null) {
    return {result: null, error: [`${path.join('=>')} is null!`]}
  } else if (typeof(input) === 'string') {
    if (this.struct) {
      let {struct} = getStruct(this.struct, path)
      if (!struct) {
        return {result: input}
      } else {
        let {type, array} = struct
        if (type === 'date') {
          //console.log(`level:${level}, date:${input}`)
          if (level>1) {
            let result = DateTime.fromISO(input)
            if (result.isValid) {
              return {result:result.toJSDate()}
            } else {
              return {result: null, error:[`not a valid date: ${input}`] }
            }
          } else { // level === 1
            try {
              let tracer = {}
              tracer.trace = new Function()
              let {filter, value} = MongodbDateParser(input, {tracer})
              if (filter) {
                result = JSON.parse(JSON.stringify(
                  filter,
                  function (__, value) { if(value==='$$date') {return `\$${key}`} else {return value} }
                ))
                state.date.push({result, parent, key})
                return {result}
              } else { // must have value
                let result = DateTime.fromISO(value)
                if (result.isValid) {
                  return {result: result.toJSDate()}
                } else {
                  return {result: null, error:[`not a valid date: ${input}`] }
                }
              }
            } catch (e) {
              return {result: null, error:[`not a valid date filter: ${input}`] }
            }
          }
        } else { // type !== date
          return {result: input}
        }
      }
    } else {
      return {result: input}
    }
  } else if (typeof(input) === 'number') {
    return {result: input}
  } else if (input instanceof Date) {
    return {result: input}
  } else if (input instanceof RegExp) {
    return {result: input}
  } else if (typeof(input) === 'object') { // should be object
    let oldkey = key
    let keys = Object.keys(input)
    //console.log({level, keys: JSON.stringify(keys), input})
    for (let key of keys) {
      // filter all __keys__ (they are auxilliary keys in the frontend)
      let newlevel = level
      if (key.startsWith('__') && key.endsWith('__')) continue
      let newpath = [...path, key]
      if (!levelKeys.includes(key)) newlevel = newlevel + 1
      if (key === '$and' && level === 0) state.lastAnd = {result, key: oldkey, parent}
      if (key === '$len' && level === 1) state.arrayLength.push({result, parent, key:oldkey})
      if (key === '$el') { state.el.push({result}) }
      let sub = this.compile(input[key], result, key, newpath, newlevel, state)
      if (sub.error) {
        error = [...error, ...sub.error]
      }
      result[key] = sub.result
      if (key === '$unwind') state.unwindCount += 1
      if (key === '$unwind') state.addFieldsCount += 1
      if (key === '$text') state.textCount += 1
    }
    // leave return in the last part
  } else {
    debugger
  }
  if (path.length === 0) { // check state and prepare output
    if (state.unwindCount>1) error = [...error, 'more than one $unwind']
    aggregate = []
    if (state.lastAnd) { // extract $text search
      let sort, addFields
      let {result:lastAnd, parent, key} = state.lastAnd
      let flags = lastAnd.$and.map(
        _ => (typeof(_)==='string' || // string: search key
             (typeof(_) === 'object' && '$unwind' in _) || // $unwind
             (typeof(_) === 'object' && '$addFields' in _) // $unwind
      )).reverse()
      let index = flags.findIndex(_ => _===false)
      let iterms
      if (index !== 0) { // have search keys or $unwind or $addFields
        if (index === -1) { // only when we just have search keys
          iterms = lastAnd.$and
          if (parent===undefined) {
            delete result.$and
          } else {
            if (key === parent.length-1) {
              parent.splice(key,1)
            } else {
              throw Error('need debug here')
            }
          }
        } else {
          iterms = lastAnd.$and.slice(-index)
          lastAnd.$and = lastAnd.$and.slice(0, -index)
        }
        let unwind, addFields
        let searchKeys = []
        iterms.forEach(_ => {
          if (typeof(_) === 'string') {
            if (_.search(' ')!==-1) { // must be a quoted string, add quote for it
              searchKeys.push(JSON.stringify(_))
            } else {
              searchKeys.push(_)
            }
          } else if ('$unwind' in _) {
            unwind = _
          } else if ('$addFields' in _) {
            addFields = _
          }
        })
        if (searchKeys.length) {
          if (state.textCount>0) {
            error.push(`both have $text and search keys`)
          }
          let search = {$search: searchKeys.join(' ')}
          if (result.$and) {
            result.$and.push({$text:search})
          } else if (input.$or) {
            result = {$and:[result, {$text: search}]}
          } else {
            result = {$text: search}
          }
        }
        if (addFields) { aggregate.push(addFields) }
        addFields = {
          searchScore: { $meta: "textScore" }
        }
        sort = {
          searchScore: { $meta: "textScore" }
        }
        if (unwind) {
          aggregate.push(unwind)
          aggregate.push({$match: result})
          aggregate.push({$project: {id:1}})
        } else {
          aggregate.push({$match: result})
          aggregate.push({$addFields: addFields})
          aggregate.push({$sort: sort})
        }
      }
    } else {
      aggregate.push({$match: result})
    }
    if (state.arrayLength.length) {
      for (let {result, parent, key} of state.arrayLength) {
        let inside = result.$len
        let name = `${key}_length`
        delete parent[key]
        parent[name] = inside
        let exists_addFields_index = aggregate.findIndex(_=>'$addFields' in _)
        let match_index = aggregate.findIndex(_=>'$match' in _)
        if (exists_addFields_index<0 || match_index < exists_addFields_index) { // add to top
          aggregate.splice(0,0,{$addFields:{[name]: {$size: `\$${key}`}}})
        } else {
          let exists_addFields = aggregate[exists_addFields_index]
          exists_addFields.$addFields[name] = {$size:`\$${key}`}
        }
      }
    }
    if (state.el.length) {
      for (let {result, parent, key} of state.el) {
        let inside = result.$el
        delete result.$el
        result.$elemMatch = inside
      }
    }
    if (state.date.length) {
      for (let {result, parent, key} of state.date) {
        //console.log(result, parent, key)
        delete parent[key]
        parent.$expr = result
      }
    }
    return {aggregate, error}
  } else {
    return {result  , error}
  }
}
Parser.prototype.autocomplete = function (input) {
  const pairKeys = ["PairComplete", "PairMissValue", 'PairOnlyOP', 'PairOnlyKey', 'ArrayWrapper']
  console.log(input)
  let {type, subtype, valueType, stateStack, extract, cursor, start, end, complete, lastEnd} = input
  let path = []
  if (!type) return {type: null} // not good cursor position for auto complete
  if (stateStack && subtype !== 'ValueBlock') {
    let parentStacks = type === 'key' ? stateStack.slice(0,-1) : stateStack
    for (let item of parentStacks) { // for value
      if (!pairKeys.includes(item.type)) continue
      if (item.type === 'ArrayWrapper') {
        let index = item.result.findIndex(_ => _.location.start.offset<=cursor && cursor<=_.location.end.offset)
        if (index !== -1) {
          path.push(index)
        }
      } else {
        let keys = item.result.keys
        if (keys.length === 1) {
          if (keys[0].indexOf('.')>=0) {
            let subkeys = keys[0].split('.')
            for (let subkey of subkeys) {
              if (subkey) path.push(subkey)
            }
          } else {
            path.push(keys[0])
          }
        } else if (keys.length > 1) {
          if (keys[0].indexOf('.')>=0) {
            let subkeys = keys[0].split('.')
            for (let subkey of subkeys) {
              if (subkey) path.push(subkey)
            }
          } else {
            path.push(keys[0])
          }
          let tails = keys.slice(1)
          for (let _ of tails) {
            path.push(`\$${_}`)
          }
        }
      }
    }
    if (type === 'key') { // for nested key operations
      let keys
      if (Array.isArray(extract[0]) && extract.length === 1) {
        keys = [...extract]
        keys[0] = keys[0].slice(0,-1)
      } else {
        keys = extract.slice(0,-1)
      }
      if (keys.length === 1) {
        if (Array.isArray(keys[0])) {
          let subkeys = keys[0]
          for (let subkey of subkeys) {
            if (subkey) path.push(subkey)
          }
        } else {
          path.push(keys[0])
        }
      } else if (keys.length > 1){
        if (Array.isArray(keys[0])) {
          let subkeys = keys[0]
          for (let subkey of subkeys) {
            if (subkey) path.push(subkey)
          }
        } else {
          path.push(keys[0])
        }
        let tails = keys.slice(1)
        for (let _ of tails) {
          path.push(`\$${_}`)
        }
      }
    }
  }
  if (!this.struct) return {type:null, path}
  let struct, root
  if (this.struct) {
    let __ = getStruct(this.struct, path)
    struct = __.struct
    root = __.root
  }
  console.log({root, struct})
  console.log(
    start,lastEnd,cursor,end,
    input,
    path,
    struct ? {
      type: struct.type,
      array: struct.array,
      root_fields:root.fields ? Object.keys(root.fields).join(','): null} : null,
  )
  //if (!this.struct) return {type:null}
  let output = []
  let result = {
    start, lastEnd, cursor, end, complete, path, output
  }

  if (type === 'key') {
    if (subtype === 'fieldKey' || subtype === 'ValueBlock' || subtype === 'Key') {
      if (this.fields.includes(extract)) {
        let matchArray = []
        if (struct) {
          if (struct.fields&&struct.fields[extract]&&struct.fields[extract].type==='date') {
            matchArray.push({
              data: `${extract}:""`,
              cursorOffset: -1,
            })
          } else {
            matchArray.push( `${extract}:` )
          }
          matchArray.push( `${extract}|` )
        } else {
          matchArray.push({
            data: `${extract}:`
          })
        }
        output.push({
          data: matchArray
        })
        output.push({
          group: 'fields',
          description: 'fields of a model',
          data: this.fields.filter(_ => _!==extract)
        })
      } else { // not match fields
        output.push({
          group: 'fields',
          description: 'fields of a model',
          data: this.fields
        })
      }
    } else if (subtype === 'KeyKey') { // balbal.asdfasd.asdf extract is array
      let thiskey = extract[0][extract[0].length-1]
      if (struct&&root&&'fields' in root) {
        let fields = Object.keys(root.fields)
        if (fields.includes(thiskey)) {
          let matchArray = []
          if (struct.fields&&struct.fields[thiskey]&&struct.fields[thiskey].type==='date') {
            matchArray.push({
              data: `${thiskey}:""`,
              cursorOffset: -1,
            })
          } else {
            matchArray.push( `${thiskey}:` )
          }
          matchArray.push( `${thiskey}|` )
          output.push({
            data: matchArray
          })
          output.push({
            group: 'subfields',
            description: 'subfields',
            data: fields.filter(_ => _!==thiskey)
          })
        } else { // not exact match
          output.push({
            group: 'subfields',
            description: 'subfields',
            data: fields
          })
        }
      } else {
        output.push({
          group: 'unknown subfields',
          always: true,
        })
      }
    } else if (subtype === 'KeyOP') { // extract is array
      console.log('path:', root.path)
      let len = extract.length
      let thiskey = extract[len-1]
      if (len===1) { // thiskey is field path

      } else { // thiskey is op

      }
    }

  } else if (type === 'value') {

  }
  console.log(JSON.stringify({extract, output},null,2))
  return result
}

module.exports = {
  parse,
  SyntaxError,
  Tracer,
  Parser,
  demoStruct,
}
