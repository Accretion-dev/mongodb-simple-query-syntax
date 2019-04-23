const path = require('path')
let {SyntaxError, parse} = require('./mongodb-simple-query-syntax.js')

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
  type: 'table',
  fields: {
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
  let length = this.content.lenth
  if (cursor<0 || cursor > length) throw Error(`bad cursor position: should be within [0, ${length}]`)

  let related = this.traceInfo.filter(_ => _.location.start.offset<=cursor && _.location.end.offset>=cursor && _.result)
  let thisStruct = null
  let prefix, suffix
  let value
  let output

  let state
  let stateStack = []
  let parent = 'block'
  const structRules = ['PairComplete', 'PairIncomplete', 'Key', 'ValuePair', 'ValueArray', 'ValueObject']
  const valueTypes = [ 'true', 'false', 'null', 'String', 'SimpleString', 'Number', 'RegularExpression' ]
  // get structure for this object
  for (let each of related) {
    let {rule:type, location, result} = each
    let start = location.start.offset
    let end = location.end.offset
    if (type === 'PairComplete') {
      stateStack.push({ type, start, end, result, keys: each.keys, })
      state = type
    } else if (type === 'PairIncomplete') {
      stateStack.push({ type, start, end, result, keys: each.keys, })
      state = type
    } else if (type === 'Object') {
      stateStack.push({ type, start, end, result })
      state = type
    } else if (type === 'Array') {
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
      output = {type: 'fieldKey', complete: 'insert', start: cursor, end:cursor, extract:""}
      break
    } else if (type === 'ws01' && (start<cursor && cursor<=end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'fieldKey', complete: 'insert', start: cursor, end:cursor, extract:""}
      break
    } else if (type === 'ws10' && (start<=cursor && cursor<end)) {
      // select field, complete: insert into cursor position, extract: ""
      output = {type: 'fieldKey', complete: 'insert', start: cursor, end:cursor, extract:""}
      break
    } else if (type === 'ws10Object' && (start<=cursor && cursor<end)) {
      output = {type: 'objectKey', complete: 'insert', start: cursor, end:cursor, extract:"", stateStack}
      break
    } else if (type === 'ws01Object' && (start<cursor && cursor<=end)) {
      output = {type: 'objectKey', complete: 'insert', start: cursor, end:cursor, extract:"", stateStack}
      break
    } else if (type === 'ws10Array' && (start<=cursor && cursor<end)) {
      output = {type: 'arrayValue', complete: 'insert', start: cursor, end:cursor, extract:"", stateStack}
      break
    } else if (type === 'ws01Array' && (start<cursor && cursor<=end)) {
      output = {type: 'arrayValue', complete: 'insert', start: cursor, end:cursor, extract:"", stateStack}
      break
    } else if (type === 'ValueBlock') {
      output = {
        type: 'fieldKey',
        complete: 'replace',
        start: value.start,
        end: value.end,
        extract:String(value.result), // string
        valueType: value.type,
        value,
        stateStack,
      }
      break
    } else if (type === 'ValueObject') { // unfinished object
      output = {
        type: 'objectKey',
        complete: 'replace',
        start: value.start,
        end: value.end,
        extract:String(value.result), // string
        valueType: value.type,
        value,
        stateStack,
      }
      break
    } else if (type === 'ws01PS'&& (start<cursor && cursor<=end)) { // unfinished object
      output = { type: 'objectValue', complete: 'insert', start: cursor, end: cursor, extract:"", stateStack}
      break
    } else if (type === 'ValueArray') { // unfinished object
      output = {
        type: 'arrayValue',
        complete: 'replace',
        start: value.start,
        end: value.end,
        extract:String(value.result), // string
        valueType: value.type,
        value,
        stateStack,
      }
      break
    } else if (type === 'Key') { // no more level under key
      value = each
      let keyString = this.content.slice(start, end+1)
      if (each.result.length !== keyString.split('|').length) {
        throw Error('should not be here, need debug')
      }
      let keyIndex = 0
      let lastEnd = 0
      for (let index=start+1; index<=cursor; index++) {
        if (this.content[index-1] === '|') {
          keyIndex += 1
          lastEnd = index-1
        }
      }
      output = {
        type: 'key',
        complete: 'replace',
        start,
        end,
        lastEnd, // when do replace, keep [start~lastStart], delete [lastStart+1 ~ end] and replace with autocomplete
        extract:each.result.slice(0, keyIndex+1), // array
        valueType: 'key',
        value,
        stateStack,
      }
      break
    } else if (type === 'ValuePair') { // no more level under key
      output = {
        type: 'pairValue',
        complete: 'replace',
        start: value.start,
        end: value.end,
        extract:String(value.result), // string
        valueType: value.type,
        value,
        stateStack,
      }
      break
    } else if (type === 'Object') {
      output = {
        type: 'edge',
        complete: null,
        start,
        end,
        value: each.result,
        valueType: 'object',
        stateStack,
      }
      break
    } else if (type === 'Array') {
      output = {
        type: 'edge',
        complete: null,
        start,
        end,
        value: each.result,
        valueType: 'array',
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

function Parser({struct, options} = {}) {
  this.struct = struct
  this.options = options || {}
}
Parser.prototype.parse = function ({content, cursor}) {
  let logSimple = this.options.logSimple
  let logFull = this.options.logFull
  let print = this.options.print
  let tracer = new Tracer({content, logSimple, logFull, print})
  this.tracer = tracer
  let result = parse(content, {tracer})
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

Parser.prototype.autocomplete = function (input) {
  let {type, stateStack} = input
  if (!type || !this.struct) return {type: null} // not good cursor position for auto complete
  console.log(input)
  if (type === 'fieldKey') {

  } else if (type === 'key') {

  }
}

module.exports = {
  parse,
  SyntaxError,
  Tracer,
  Parser,
  demoStruct,
}
