const path = require('path')
let {SyntaxError, parse} = require('./mongodb-simple-query-syntax.js')
let {parse: NumberParser} = require('./filter-number.js')
let {parse: DateParser} = require('./filter-date.js')
let {parse: MongodbDateParser} = require('./filter-date-mongodb.js')
const {DateTime} = require('luxon')

// general operations
const OP_expr = { // expr means Expr or fields or value
  description:'expr', type:'expr', op: true,
  fields: {
    $and: { description:"and", type:'expr', array:true},
    $or: { description:"or", type:'expr', array:true},
    $not: { description:"not", type:'expr', array:true},
    $eq: { description:"==",  type:'expr_op', array:true},
    $lt: { description:"<",   type:'expr_op', array:true},
    $gt: { description:">",   type:'expr_op', array:true},
    $lte: { description:"<=", type:'expr_op', array:true},
    $gte: { description:">=", type:'expr_op', array:true},
    $ne: { description:"!=",  type:'expr_op', array:true},
    $abs: { description:"abs", type:'fields'},
    $hour: { description:"hour", type:'fields'},
    $minute: { description:"minute", type:'fields'},
    $day: { description:"day", type:'fields'},
    $month: { description:"month", type:'fields'},
    $year: { description:"year", type:'fields'},
  }
}
const OP_expr_op = { // expr means Expr or fields or value
  description:'expr', type:'expr_op', op: true,
  fields: {
    $abs: { description:"abs", type:'fields'},
    $hour: { description:"hour", type:'fields'},
    $minute: { description:"minute", type:'fields'},
    $day: { description:"day", type:'fields'},
    $month: { description:"month", type:'fields'},
    $year: { description:"year", type:'fields'},
  }
}
const OP_text = {
  description: 'text', type: 'text', op: true,
  fields: {
    $search: {
      description: 'search', type: 'String',
    }
  }
}
const OP_ROOT = {
  op: true,
  description: 'operation for root level',
  fields: {
    $expr: OP_expr,
    $where: {
      description: 'where', type:'String',
    },
    $text: OP_text,
    $unwind: {
      description: 'unwind', type: 'String',
    },
    $addFields: {
      description: 'addFields', type: 'object'
    }
  }
}
let OP_logical = {
  op: true,
  description: 'operation for logical',
  fields: {
    $and: { description: 'and', type: 'array', array: true, },
    $or:  { description: 'or',  type: 'array', array: true, },
  }
}

const OP_string = {
  op: true,
  description: 'operations for string',
  type: 'string',
  fields: {
    $in: { description:'in', type: 'string', array: true },
    $nin: { description:'nin', type: 'string', array: true },
    $lt: { description:"<", type:'String' },
    $gt: { description:">", type:'String' },
    $lte: { description:"<=", type:'String' },
    $gte: { description:">=", type:'String' },
    $ne: { description:"!=", type:'String' },
  }
}
const OP_number = {
  op: true,
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
const OP_boolean = {
  op: true,
  description: 'operations for number',
  type: 'boolean',
}
const OP_date = {
  op: true,
  description: 'operations for date',
  type: 'date',
  fields: {
    $lt: { description:"<", type:'date' },
    $gt: { description:">", type:'date' },
    $lte: { description:"<=", type:'date' },
    $gte: { description:">=", type:'date' },
  }
}
const OP_global = {
  op: true,
  description: 'operations for all fields',
  fields: {
    $exists: { description:'exists', type: 'Boolean' },
    $type: { description:'type', type: 'number' },
  }
}
const OP_array_object = {
  op: true,
  description: 'operations for array_object',
  fields: {
    $len: { description:'len', type: 'number' },
    $el: { description:'elemMatch', type: 'object' },
    $elemMatch: { description:'elemMatch', type: 'object' },
  }
}
const OP_array = {
  op: true,
  description: 'operations for date',
  fields: {
    $in: { description:'in', type: 'unknown', array: true },
    $nin: { description:'nin', type: 'unknown', array: true },
    $el: { description:'elemMatch', type: 'object' },
    $elemMatch: { description:'elemMatch', type: 'object' },
    $lt: { description:"<", type:'unknown' },
    $gt: { description:">", type:'unknown' },
    $lte: { description:"<=", type:'unknown' },
    $gte: { description:">=", type:'unknown' },
    $ne: { description:">=", type:'unknown' },
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
const OP_objarray_string_mixed = {
  op: true,
  description: 'mix of ObjArray and string',
  type:'ObjArray_or_string',
  fields: {
    $len: { description:'len', type: 'number' },
    $el: { description:'elemMatch', type: 'object' },
    $elemMatch: { description:'elemMatch', type: 'object' },
    $ne: { description:"!=", type:'String' },
    $in: { description:'in', type: 'string', array: true },
    $nin: { description:'nin', type: 'string', array: true },
    $lt: { description:"<", type:'String' },
    $gt: { description:">", type:'String' },
    $lte: { description:"<=", type:'String' },
    $gte: { description:">=", type:'String' },
  },
}
const OPDict = {
  global: Object.keys(OP_global.fields),
  logical: ['$and','$or'],
  object: [],
  //root: ['$expr','$where'],
  root: ['$expr','$where','$text','$unwind','$addFields'],
  root_full: ['$expr','$where','$text','$unwind','$addFields'],
  ObjArray_or_string: [],
  fields: [],
  text: Object.keys(OP_text.fields),
  expr: Object.keys(OP_expr.fields),
  expr_op: Object.keys(OP_expr_op.fields),
  string: Object.keys(OP_string.fields),
  String: Object.keys(OP_string.fields),
  number: Object.keys(OP_number.fields),
  date: Object.keys(OP_date.fields),
  array_string: Object.keys(OP_array_string.fields),
  array_number: Object.keys(OP_array_number.fields),
  array_date:   Object.keys(OP_array_date.fields),
  array_object:   Object.keys(OP_array_object.fields),
}
const OPObjDict = {
  string: OP_string,
  String: OP_string,
  Boolean: OP_boolean,
  number: OP_number,
  expr: OP_expr,
  expr_op: OP_expr_op,
  text: OP_text,
  date: OP_date,
  array_object: OP_array_object,
  global: OP_global,
  object: OP_global,
  logical: OP_logical,
}

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

// define of Tracer
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

  let related = this.traceInfo.filter(_ => _.location.start.offset<=cursor && _.location.end.offset>=cursor && _.result!==null)
  let thisStruct = null
  let prefix, suffix
  let value
  let output

  let stateStack = []
  let parent = 'block'
  const structRules = ['PairComplete', 'PairMissValue', 'PairOnlyOP', 'PairOnlyKey', 'Key', 'ValuePair', 'ValueArray', 'ValueObject']
  const valueTypes = [ 'true', 'false', 'null', 'String', 'SimpleString', 'Number', 'RegularExpression' ]
  // get structure for this object
  const stateKeys = [
    'PairComplete',
    'PairMissValue',
    'PairOnlyOP',
    'PairOnlyKey',
    'Object',
    'Array',
    'ArrayWrapper',
    'AND',
    'OR',
    'ANDArrayWrapper',
    'ORArrayWrapper',
  ]
  for (let each of related) {
    let {rule:type, location, result} = each
    let start = location.start.offset
    let end = location.end.offset
    if (stateKeys.includes(type)) {
      stateStack.push({ type, start, end, result})
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
      output = {type: 'key', subtype: 'fieldKey', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws01' && (start<cursor && cursor<=end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'key', subtype: 'fieldKey', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws10' && (start<=cursor && cursor<end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'key', subtype: 'fieldKey', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws10Object' && (start<=cursor && cursor<end)) {
      output = {type: 'key', subtype: 'objectKey', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws01Object' && (start<cursor && cursor<=end)) {
      output = {type: 'key', subtype: 'objectKey', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws10Array' && (start<=cursor && cursor<end)) {
      output = {type: 'value', subtype: 'arrayValue', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ws01Array' && (start<cursor && cursor<=end)) {
      output = {type: 'value', subtype: 'arrayValue', complete: 'insert', rawtype: type, extract:"", start: cursor, end:cursor, stateStack}
      break
    } else if (type === 'ValueBlock') {
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
      if (start<cursor && cursor<end) {
        output = {
          type: 'key',
          subtype: 'objectKey',
          complete: 'insert',
          start,
          end,
          value: each.result,
          stateStack,
        }
      } else {
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
      }
      break
    } else if (type === 'Array') {
      if (start<cursor && cursor<end) {
        output = {
          type: 'value',
          subtype: 'arrayValue',
          complete: 'insert',
          start,
          end,
          value: each.result,
          stateStack,
        }
      } else {
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
      }
      break
    } else if (type.startsWith('Nested')) {
      if (start===cursor || cursor===end) {
        output = {
          type: 'edge',
          subtype: type,
          valueType: 'logical',
          complete: null,
          start,
          end,
          value: each.result,
          stateStack,
        }
        break
      }
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
  this.keyPositions = []
  this.ORs = []
  const stopRules = [
    'ws10', 'ws01', 'ws00', 'Key', 'String', 'SimpleString',
    'ws01Object', 'ws10Object', 'ws01Array', 'ws10Array',
    'ws01PS',
  ]
  const valueTypes = [
    'Key', 'KeyKey',
    'ws01PS', 'KeyOP',
    'SimpleString',
  ]
  const valueConditionTypes = {
    Object: {
      filter: _ => Object.keys(_.result).length === 0,
      pos: _ => _.location.end.offset-1,
    },
    Array: {
      filter: _ => _.result.length === 0,
      pos: _ => _.location.end.offset-1,
    },
    SimpleValue: {
      filter: _ => typeof(_.result) !== 'string' && !(_.result instanceof RegExp),
      pos: _ => _.location.end.offset,
    },
    String: {
      filter: _ => true,
      pos: _ => _.location.end.offset-1,
    },
    RegularExpression: {
      filter: _ => true,
      pos: _ => _.location.end.offset-1,
    },
    ws10: {
      filter: _ => _.location.start.offset === 0 && (_.location.end.offset > _.location.start.offset),
      pos: _ => _.location.end.offset - 1,
    },
    ws01: {
      filter: _ => _.location.end.offset === this.content.length && (_.location.end.offset > _.location.start.offset),
      pos: _ => _.location.start.offset + 1,
    },
  }
  let stop = false
  let failed = false
  let slevel = 0
  for (let each of this.history.slice().reverse()) {
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
  for (let each of this.traceInfo) {
    let {rule} = each
    let start = each.location.start.offset
    let end = each.location.end.offset
    if (valueTypes.includes(rule)) {
      this.keyPositions.push({type: rule, start, end})
    } else if (rule in valueConditionTypes) {
      let __ =  valueConditionTypes[rule]
      if (__.filter(each)) {
        this.keyPositions.push({type: rule, end: __.pos(each), start})
      }
    } else if (rule === 'ORSeperator') {
      this.ORs.push(end)
    }
  }
  this.keyPositions.reverse()
  this.traceInfo.reverse()
  this.ORs.reverse()
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
  if (rule === 'start' && type === 'rule.match') { // finish trace, do traceback
    this.traceback()
    if (this.logSimple) {
      console.log('===============trace tree================')
      for (let each of this.traceInfo) {
        this.retrace(each)
      }
    }
  }
}

// define of Parser
function Parser({struct, options} = {}) {
  this.struct = struct
  if (this.struct) {
    this.fields = Object.keys(this.struct.fields)
    this.withPrimaryKeys = this.fields.filter(_ => 'primary_key' in this.struct.fields[_])
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
  } else if (type === 'Boolean') {
    return OP_boolean
  } else if (type === 'date') {
    ops = OP_date
  } else if (type === 'expr') {
    ops = OP_ROOT.fields.$expr
  } else if (type === 'expr_op') {
    ops = OP_expr_op
  } else if (type === 'text') {
    ops = OP_ROOT.fields.$text
  }
  if (ops.fields && key in ops.fields) {
    return ops.fields[key]
  } else {
    return null
  }
}
function getSubStruct (key, current_struct, path, index, vtype) {
  //console.log({key, current_struct, path, index})
  const levelKeys = ['$el', '$elemMatch', '$and', '$or', '$not']
  let {type, array} = current_struct
  if (current_struct.fields && key in current_struct.fields) { // get current_struct in .fields
    current_struct =  current_struct.fields[key]
    if ('primary_key' in current_struct) { // e.g., tags...
      let nextPath = path[index+1]
      // if not use syntax sugger (use tags as tags.tag_name), nextPath must be one of $el, $elemMatch or $len
      if (vtype==='value' || (vtype==='key' && nextPath !== undefined)) { // tags: [v], tags:{v}
        if (nextPath!==undefined && (!nextPath.startsWith('$') ||  // e.g.: tags.tag_name
            ["$el", "$elemMatch", "$len"].includes(nextPath))) {   // e.g.: tags|el
            // tags should be a array of object
          return current_struct
        } else { // e.g.: tags: , tags|in:, tags should be abbr of tags.tag_name
          return current_struct.fields[current_struct.primary_key]
        }
      } else { // type is key and nextPath is undefined, so the autoComplete should complete both
        return OP_objarray_string_mixed
      }
    } else { // normal exists fields, like 'title', 'ctime'
      return current_struct
    }
  } else { // get current_struct based on type and array
    if (current_struct.root) { // special ops for root
      if (key in OP_ROOT.fields) {
        return OP_ROOT.fields[key]
      }
    }
    if (key === '$exists') {
      return OP_boolean
    } else if (key === '$type') {
      return OP_number
    } else if (array) {
      if (key === '$len') {
        return OP_number
      }
      if (type === 'object') {
        if (key.startsWith('$')) { // e.g., tags|in: [...], tags: {$gt: ...}
          if (levelKeys.includes(key)) {
            return current_struct
          } else {
            return null
          }
        } else {
          return null
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
function getStruct(struct, path, type) {
  let current_struct = struct
  let current_root = struct
  let current_field = null
  let last_current_struct
  let {root} = struct
  for (let index in path) {
    index = Number(index)
    let each = path[index]
    if (!root || (root &&!(each === "$and" || each === "$or"))) {
      if (root) root = false
      if (current_root.fields && each in current_root.fields) {
        current_field = current_root.fields[each]
      }
      last_current_struct = current_struct
      current_struct = getSubStruct(each, current_struct, path, index, type)
      if (!current_struct) {
        if (path[path.length-1] === '$exists') {
          return {struct:OP_boolean,root:null, field:null}
        } else if (path[path.length-1] === '$type') {
          return {struct:OP_number,root:null, field:null}
        } else {
          return {struct:null}
        }
      } // can not parse struct
      if (current_struct.type === 'object' && current_struct.path !== 'metadatas.value') {
        current_root = current_struct
      } else if (current_struct.type === 'ObjArray_or_string') {
        console.log({last_current_struct, path, each})
        current_root = last_current_struct.fields[each]
      }
    } // else level not change
  }
  return {struct:current_struct, root:current_root, field: current_field}
}
// TODOs: support syntax sugger for primary_key
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
    if (key.startsWith('$')) {
      return {result, error}
    } else {
      return {result:{$in: result}, error}
    }
  } else if (input === null) {
    return {result: null, error: [`${path.join('=>')} is null!`]}
  } else if (typeof(input) === 'string') {
    if (this.struct) {
      let {struct} = getStruct(this.struct, path, 'value')
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
    for (let keyIndex in keys) {
      let key = keys[keyIndex]
      let value = input[key]
      if (this.withPrimaryKeys.includes(key)) {
        let inEL = typeof(value)==='object' && Object.keys(value).length === 1 && ['$el', '$elemMatch','$len'].includes(Object.keys(value)[0])
        // console.log({inEL, value, keys:Object.keys(value)})
        if (!inEL) {
          key = `${key}.${this.struct.fields[key].primary_key}`
        }
      }
      // filter all __keys__ (they are auxilliary keys in the frontend)
      let newlevel = level
      if (key.startsWith('__') && key.endsWith('__')) continue
      let newpath = [...path, key]
      if (!levelKeys.includes(key)) newlevel = newlevel + 1
      if (key === '$and' && level === 0) state.lastAnd = {result, key: oldkey, parent}
      if (key === '$len' && level === 1) state.arrayLength.push({result, parent, key:oldkey})
      if (key === '$el') { state.el.push({result}) }
      let sub = this.compile(value, result, key, newpath, newlevel, state)
      if (sub.error) {
        error = [...error, ...sub.error]
      }
      result[key] = sub.result
      if (key === '$unwind') state.unwindCount += 1
      if (key === '$addFields') state.addFieldsCount += 1
      if (key === '$text') state.textCount += 1
    }
    // leave return in the last part
  } else if (typeof(input) === 'boolean') {
    return {result: input}
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
const testAutoComplete = [
  `title: haha`,
  `title: 'hehe'`,
  `title: {$gt:'123', $in:[1,2]}`,
  `title|lt: foo`,
  `title|in:[foo,"haha hehe"]`,
  `title: [123]`,
  `ctime: "2018"`,
  `ctime|lt: "2018"`,
  `ctime: {$gt:'2018', $lt:"2018"}`,
  `ctime: [foo,bar]`,
  `flags|exists: true`,
  `flags:{debug: true}`,
  `flags.debug: true`,
  `flags.count|gt: 10`,
  `flags.count|in: [10, 20,]`,
  `tag:{unexists:1}`,
  `tag:{$exists:true}`,
  `tag|$exists:tru  e`,
  `tags: foo`,
  `tags: /foo/`,
  `tags.tag_name: /foo/`,
  `tags:{$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:10]}}`,
  `tags: [foo, bar]`,
  `tags|len: 5`,
  `tags|len|gt: 5`,
  `tags|len: {$gt:5, $lt:10}`,
  `tags|lt: foo`,
  `tags|in: [foo, bar]`,
  `tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:10]}}`,
  `tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:10]}]`,
  `metadatas: [foo, bar]`,
  `metadatas|in: [foo, bar]`,
  `metadatas.metadata_name|in: [foo, bar]`,
  `$and:[$or: [ tags: foo, tags: /foo/, ], $or: [ tags|lt: foo, tags|in: [foo, bar], ] ]`,
  `$where: "blablabla"`,
  `$text: {$search: good}`,
  `$text|$search: "good"`,
  `$expr:{$and:[$gt:["$title", "good"]]}`,
  `$expr|and:[$or:[$lt:[$hour:"$ctime", 10]], $eq:["$title", /foo/]]`,
  'last "search template" -gg',
]
const valueCompleteDict = {
  ObjArray_or_string: _ => ([
    {data:`""`, cursorOffset:-1},
    {data:`//`, cursorOffset:-1},
    {data:`{}`, cursorOffset:-1},
    {data:`[]`, cursorOffset:-1},
  ]),
  String: _ => ([
    {data:`""`, cursorOffset:-1},
  ]),
  date: _ => ([
    {data:`""`, cursorOffset:-1},
  ]),
  array: _ => ([
    {data:`[]`, cursorOffset:-1},
  ]),
  object: _ => ([
    {data:`{}`, cursorOffset:-1, comment: 'object ops'},
  ]),
  expr: _ => ([
    {data:`{}`, cursorOffset:-1, comment: '$expr ops'},
  ]),
  text: _ => ([
    {data:`{}`, cursorOffset:-1, comment: '$text ops'},
  ]),
  string: _ => {
    if (!_) {
      return [
        {data:`""`, cursorOffset:-1, comment: 'string in quote'},
        {data:`//`, cursorOffset:-1, comment: 'regexp'},
        {data:`{}`, cursorOffset:-1, comment: 'string ops'},
      ]
    } else {
      return [
        {data:`""`, cursorOffset:-1, comment: `abbr of ${_}:""`},
        {data:`//`, cursorOffset:-1, comment: `abbr of ${_}://`},
        {data:`{}`, cursorOffset:-1, comment: `abbr of ${_}:{}`},
      ]
    }
  },
}
const keyvalueCompleteDict = {
  Boolean: _ => ([
    `${_}:`,
  ]),
  ObjArray_or_string: _ => ([
    `${_}:`,
    {data:`${_}:""`, cursorOffset:-1},
    {data:`${_}://`, cursorOffset:-1},
    {data:`${_}:{}`, cursorOffset:-1},
    {data:`${_}:[]`, cursorOffset:-1},
  ]),
  String: _ => ([
    {data:`${_}:""`, cursorOffset:-1},
  ]),
  number: _ => ([
    `${_}:`,
  ]),
  date: _ => ([
    {data:`${_}:""`, cursorOffset:-1, comment: 'date filter'},
  ]),
  array: (_,comment) => ([
    {data:`${_}:[]`, cursorOffset:-1, comment},
  ]),
  object: _ => ([
    {data:`${_}:{}`, cursorOffset:-1, comment: 'object ops'},
  ]),
  text: _ => ([
    {data:`${_}:{}`, cursorOffset:-1, comment: '$text ops'},
  ]),
  fields: _ => ([
    `${_}:`,
  ]),
  expr: _ => ([
    {data:`${_}:{}`, cursorOffset:-1, comment: '$expr ops'},
  ]),
  string: (_,primary_key) => {
    if (primary_key) {
      return [
        `${_}:`,
        {data:`${_}:""`, cursorOffset:-1, comment: `abbr of ${_}.${primary_key}:""`},
        {data:`${_}://`, cursorOffset:-1, comment: `abbr of ${_}.${primary_key}://`},
        {data:`${_}:{}`, cursorOffset:-1, comment: `abbr of ${_}.${primary_key}:{}`},
      ]
    } else {
      return [
        `${_}:`,
        {data:`${_}:""`, cursorOffset:-1, comment: 'string in quote'},
        {data:`${_}://`, cursorOffset:-1, comment: 'regexp'},
        {data:`${_}:{}`, cursorOffset:-1, comment: 'string ops'},
      ]
    }
  },
}
function opSimpleStruct(struct) {
  struct = Object.assign({}, struct)
  let fields = Object.keys(struct.fields)
  let newfields = {}
  fields.forEach(key=>{ newfields[key.slice(1)] = struct.fields[key] })
  struct.fields = newfields
  return struct
}
function keyMatch(output, key, structs) {
  let fullkeys = output.map(_ => _.data).flat()
  if (!fullkeys.includes(key)) return // do nothing for output
  let index = output.findIndex(_ => _.data.includes(key))
  let item
  if (index!==0) {
    item = output.splice(index,1)[0]
    output.splice(0,0,item)
  } else {
    item = output[0]
  }
  let tail = item.data.filter(_ => _!==key)
  let struct = structs.find(_ => Object.keys(_.fields).includes(key))

  let thisarray = struct.fields[key].array
  let thistype  = struct.fields[key].type
  let primary_key = struct.fields[key].primary_key
  let isop      = struct.op
  let head = []
  if (!primary_key) {
    if (isop) {
      thistype = thisarray?'array':thistype
      head = keyvalueCompleteDict[thistype] && keyvalueCompleteDict[thistype](key)
    } else {
      if (thistype === 'string' || thistype === 'number') {
        head = [
          ...keyvalueCompleteDict[thistype](key),
          ...keyvalueCompleteDict.array(key, `abbr of ${key}|in:[]`), // add title:[] for abbr of 'title|in:[]'
        ]
      } else {
        head = keyvalueCompleteDict[thistype](key)
      }
    }
  } else { // tags
    let ptype = struct.fields[key].fields[primary_key].type
    head = [
      ...keyvalueCompleteDict[ptype](key, primary_key),
      ...keyvalueCompleteDict.array(key, `abbr of ${key}.${primary_key}|in:[]`),
    ]
  }
  if (item.group === 'fields') {
    head.push(`${key}|`)
  }
  item.data = [...head, ...tail]
}
function getPath(type, stack, cursor, extract) {
  let path = []
  let rawpath = []
  const pairKeys = ["PairComplete", "PairMissValue", 'PairOnlyOP', 'PairOnlyKey', 'ArrayWrapper']
  let parentStacks = type === 'key' ? stack.slice(0,-1) : stack
  for (let item of parentStacks) { // for value
    if (!pairKeys.includes(item.type)) continue
    if (item.type === 'ArrayWrapper') {
      let index = item.result.findIndex(_ => _.location.start.offset<=cursor && cursor<=_.location.end.offset)
      if (index !== -1) {
        path.push(index)
        rawpath.push(index)
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
        rawpath.push(keys[0])
      } else if (keys.length > 1) {
        if (keys[0].indexOf('.')>=0) {
          let subkeys = keys[0].split('.')
          for (let subkey of subkeys) {
            if (subkey) path.push(subkey)
          }
        } else {
          path.push(keys[0])
        }
        rawpath.push(keys[0])
        let tails = keys.slice(1)
        for (let _ of tails) {
          path.push(`\$${_}`)
          rawpath.push(`\$${_}`)
        }
      }
    }
  }
  if (type === 'key') { // for nested key operations
    let keys
    if (extract === undefined) {
      keys = null // extract is undefined, inside empty {} or []
    } else if (Array.isArray(extract[0]) && extract.length === 1) {
      keys = [...extract]
      keys[0] = keys[0].slice(0,-1)
    } else {
      keys = extract.slice(0,-1)
    } // else extract is undefined
    if (keys) {
      if (keys.length === 1) {
        if (Array.isArray(keys[0])) {
          let subkeys = keys[0]
          for (let subkey of subkeys) {
            if (subkey) path.push(subkey)
          }
          rawpath.push(subkeys.join('.'))
        } else {
          path.push(keys[0])
          rawpath.push(keys[0])
        }
      } else if (keys.length > 1){
        if (Array.isArray(keys[0])) {
          let subkeys = keys[0]
          for (let subkey of subkeys) {
            if (subkey) path.push(subkey)
          }
          rawpath.push(subkeys.join('.'))
        } else {
          path.push(keys[0])
          rawpath.push(keys[0])
        }
        let tails = keys.slice(1)
        for (let _ of tails) {
          path.push(`\$${_}`)
          rawpath.push(`\$${_}`)
        }
      }
    } // else extract is undefined, inside empty {} or []
  }
  return {path, rawpath}
}

Parser.prototype.getAllSubFields = function () {
  function deep(struct, father, array) {
    for (let key in struct.fields) {
      array.push(`"\$${father}${key}"`)
      if ('fields' in struct.fields[key]) deep(struct.fields[key], `${father}${key}.`, array)
    }
  }
  if (this.allSubFields) {
    return this.allSubFields
  } else {
    this.allSubFields = []
    deep(this.struct, '', this.allSubFields)
    return this.allSubFields
  }
}
Parser.prototype.autocomplete = function (input) {
  let {type, subtype, valueType, stateStack, extract, cursor, start, end, complete, lastEnd, rawtype} = input
  console.log('===================================================================================')
  console.log(input)
  let path = []
  let rawpath = []
  if (!type) return {type: null} // not good cursor position for auto complete
  if (stateStack && subtype !== 'ValueBlock') {
    let stack = stateStack.filter(_ => !(['AND','OR', 'ANDArrayWrapper', 'ORArrayWrapper'].includes(_.type)))
    // console.log('stack:', stack)
    let __ = getPath(type, stack, cursor, extract)
    path = __.path
    rawpath = __.rawpath
  }
  let inLastAnd = this.tracer.ORs.length === 0 || cursor >= this.tracer.ORs[this.tracer.ORs.length-1]
  if (!this.struct) return {type:null, path} // do not do autocomplete without struct infomation

  let structPath = path.filter(_ => typeof(_)!=='number')
  let inExpr = path.findIndex(_ => _==='$expr') > -1
  let inSubTop = !inExpr && path.findIndex(_ => _==='$el' || _==='$elemMatch') > -1
  let isSubTop = inSubTop && ['$and', '$or', '$el', '$elemMatch'].includes(structPath[structPath.length-1])
  let isTop = !inExpr && !isSubTop && (path.length === 0 || ['$and', '$or'].includes(structPath[structPath.length-1]))
  let isKey = type === 'key' || (type==="value" && (subtype === 'arrayValue' && (isTop || isSubTop || inExpr)))
  let inExprLike = path.findIndex(_ => _==='$unwind') > -1 || path.findIndex(_ => _==='$addFields') > -1
  console.log('path:', path, 'rawpath:', rawpath, 'inLastAnd:', inLastAnd)
  console.log({structPath, isTop, isSubTop, isKey, inExprLike})

  let struct, root, field
  if (this.struct) {
    let __ = getStruct(this.struct, structPath, isKey?'key':'value')
    struct = __.struct
    root = __.root
    field = __.field
  }
  console.log({
    root:root?JSON.parse(JSON.stringify(root)):null,
    struct:struct?JSON.parse(JSON.stringify(struct)):null,
    field:field?JSON.parse(JSON.stringify(field)):null,
  })
  console.log(
    start,lastEnd,cursor,end,
    input,
    struct ? {
      type: struct.type,
      array: struct.array,
      root_fields: root ? (root.fields ? Object.keys(root.fields).join(',') : null): null
    }: null,
  )
  //if (!this.struct) return {type:null}
  let output = []
  let result = {
    type:null, complete, valueType:null, completeField: null, string:null, completeType: null, extract, path, rawpath, start, lastEnd, cursor, end, output
  }

  if (isKey) {
    result.type = 'key'
    if (subtype === 'fieldKey' ||
        subtype === 'ValueBlock' ||
        subtype === 'objectKey' ||
        (subtype === 'arrayValue' && (isTop || isSubTop || inExpr)) ||
        subtype === 'KeyKey' ||
        (subtype === 'KeyOP' && extract.length === 1)
        ) {
      let thiskey
      if (subtype === 'KeyKey') { // e.g., tags.tag_name, return tag_name
        thiskey = extract[0][extract[0].length-1]
      } else if (subtype === 'objectKey') {
        if (!extract) {
          thiskey = ''
        } else {
          thiskey = extract[0]
        }
      } else {
        // when subtype is key, thiskey is a array and will not match, as expected
        thiskey = extract
      }
      result.string = thiskey

      if (struct&&root&&'fields' in root) { // known struct and root
        if (!['ObjArray_or_string', 'object'].includes(struct.type) && subtype==="objectKey") {
          // e.g., title: {}
          let data = OPDict[struct.type]
          output.push({
            group: `${struct.type} ops`,
            data,
          })
          keyMatch(output, thiskey, [OPObjDict[struct.type]])
        } else if (struct.type !== 'ObjArray_or_string' || ['KeyKey', 'KeyOP', 'fieldKey'].includes(subtype)) {
          let structs = []
          if (!inExpr) {
            let fields = Object.keys(root.fields)
            structs.push(root)
            output.push({
              group: 'fields',
              description: 'subfields',
              data: fields
            })
          } else { // inExpr
            let fields = OPDict[struct.type]
            structs.push(OPObjDict[struct.type])
            output.push({
              group: struct.type,
              description: struct.type,
              data: fields
            })
            if (struct.type === 'expr_op') {
              output.push({
                group: 'all sub fields',
                description: 'all sub fields',
                data: this.getAllSubFields()
              })
            }
          }
          if (isTop) {
            if (inLastAnd) {
              output.push({
                group: 'full root ops',
                description: 'operation in the root level(last and)',
                data: OPDict.root_full
              })
            } else {
              output.push({
                group: 'root ops',
                description: 'operation in the root level',
                data: OPDict.root
              })
            }
            output.push({
              group: 'logical ops',
              data: OPDict.logical
            })
            structs.push(OP_ROOT)
            structs.push(OP_logical)
          }
          if (isSubTop) {
            output.push({
              group: 'logical ops',
              data: OPDict.logical
            })
            structs.push(OP_logical)
          }
          keyMatch(output, thiskey, structs)
        } else if (subtype === 'arrayValue') {
          debugger
        } else { // tags: {}, struct type is 'ObjArray_or_string'
          output = output.concat([
            {
              group: `abbr of ${path[path.length-1]}.${root.primary_key}`,
              data: OPDict.String,
            },
            {
              group: `${path[path.length-1]} object ops`,
              data: OPDict.array_object,
            }
          ])
          let structs = [OP_string, OP_array_object]
          keyMatch(output, thiskey, structs)
        }
      } else { // unknown (struct and root)
        output.push({
          group: `${rawpath.join('.')}.?`,
          always: true,
        })
        if (subtype !== 'KeyKey') { // e.g., flags.
          output.push({
            group: `global ops`,
            data: OPDict.global,
          })
        }
      }
      result.valueType = 'key_only'
    } else if (subtype === 'KeyOP') { //
      let len = extract.length
      let thiskey = extract[len-1]
      let lastkey = extract[len-2]
      result.string = thiskey
      let structs = []
      if (struct) {
        let optype = struct.type
        let ops = OPDict[optype]
        if (ops.length>0) { // title|
          ops = ops.filter(_ => _.startsWith('$')).map(_ => _.slice(1))
          output.push({
            group: `${optype} ops`,
            data:ops,
          })
          structs.push( opSimpleStruct(OPObjDict[optype]) )
        } else if (optype === 'ObjArray_or_string') { // tags|
          output.push({
              group: `abbr of ${path[path.length-1]}.${root.primary_key}`,
              data: OPDict.String.map(_ => _.slice(1)),
          })
          output.push({
              group: `${path[path.length-1]} object ops`,
              data: OPDict.array_object.map(_ => _.slice(1)),
          })
          structs.push( opSimpleStruct(OPObjDict.String) )
          structs.push( opSimpleStruct(OPObjDict.array_object) )
        } else if (lastkey === 'el') { // tags|el|or
          ops = OPDict.logical
          ops = ops.map(_ => _.slice(1))
          output.push({
            group: `$el ops`,
            data:ops,
          })
          structs.push( opSimpleStruct(OPObjDict.logical) )
        }
        if (optype==='object') { // e.g., flags
          output.push({
            group: `global ops`,
            data: OPDict.global.map(_ => _.slice(1)),
          })
          structs.push( opSimpleStruct(OPObjDict.global) )
        }
        keyMatch(output, thiskey, structs)
      } else {
        output.push({
          group: `op for unknown structure`,
          always: true,
        })
      }
      result.valueType = 'key_op'
    } else if (subtype === 'Key') { // do not complete for complete keys
      result.valueType = 'key_pair'
      let len = extract.length
      let thiskey = extract[len-1]
      result.string = thiskey
    }
    if (subtype === 'ValueBlock' && inLastAnd) {
      result.valueType = 'key_value'
      result.completeField = '$text'
    }
  } else if (type === 'value') { // autocomplete value
    result.string = extract
    result.type = 'value'
    if (field) {
      result.completeType = field.type
      result.completeField = field.path
    }
    if (struct) {
      result.valueType = struct.type
    } else {
      result.valueType = null
    }
    if (subtype === 'pairValueNull') {
      let thiskey = path[path.length-1]
      if (thiskey === '$el' || thiskey === '$elemMatch') {
        output.push({
          group: `type: object`,
          data: valueCompleteDict.object(),
        })
      } else if (['$and', '$or', '$not'].includes(thiskey)) {
        output.push({
          group: `type: array`,
          data: valueCompleteDict.array(),
        })
      } else if (inExprLike) {
        output.push({
          group: `all sub fields`,
          data: this.getAllSubFields(),
        })
      } else if (struct) {
        let thisarray = struct.array
        let thistype  = struct.type
        let isop      = struct.op
        let primary_key = field && field.primary_key
        if (thistype === 'fields') {
          output.push({
            group: `all sub fields`,
            data: this.getAllSubFields(),
          })
        } else if (!primary_key) {
          thistype = thisarray?'array':thistype
          let item = valueCompleteDict[thistype] && valueCompleteDict[thistype]()
          if (item !== undefined) {
            if (!isop) {
              if (thistype === 'string' || thistype === 'number') {
                item.push({
                  data: "[]",
                  cursorOffset: -1,
                  comment: `abbr of ${thiskey}|in:[]`
                })
              }
            }
            output.push({
              group: `type: ${thistype}`,
              data: item,
            })
          }
        } else {
          thistype = thisarray?'array':thistype
          let item = valueCompleteDict[thistype] && valueCompleteDict[thistype](`${thiskey}.${primary_key}`)
          if (item !== undefined) {
            if (!isop) {
              if (thistype === 'string' || thistype === 'number') {
                item.push({
                  data: "[]",
                  cursorOffset: -1,
                  comment: `abbr of ${thiskey}.${primary_key}|in:[]`
                })
              }
            }
            output.push({
              group: `type: ${thistype}`,
              data: item,
            })
          }
        }
      }
    } else {
      if (struct) {
        let thistype  = struct.type
        if (subtype === 'arrayValue' && structPath[structPath.length-1]!=='$in') {
          let group
          if (field.primary_key) {
            group = `abbr of ${field.path}.${field.primary_key}|in:[]`
          } else {
            group = `abbr of ${field.path}|in:[]`
          }
          output.push({
            group,
            always: true,
          })
        }
        output.push({
          group: `type: ${struct.type}`,
          always: true,
        })
        if (thistype === 'fields') {
          output.push({
            group: `all sub fields`,
            data: this.getAllSubFields(),
          })
        }
      }
      if (inExprLike) {
        output.push({
          group: `all sub fields`,
          data: this.getAllSubFields(),
        })
      }
    }
  }
  console.log(JSON.stringify({extract, output},null,2))
  console.log(result)
  return result
}

//module.exports =
export {
  parse,
  SyntaxError,
  Tracer,
  Parser,
  demoStruct,
}
