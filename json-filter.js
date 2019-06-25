const path = require('path')
let {SyntaxError, parse}  = require('./pegjs/mongodb-simple-query-syntax.js').default
let {parse: NumberParse} = require('./pegjs/filter-number.js').default
let {parse: DateParse}   = require('./pegjs/filter-date.js').default
let {parse: JsonParse}   = require('./pegjs/json-filter.js').default
const {DateTime} = require('luxon')
let _ = require('lodash')

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

class Parser {
  constructor ({tree, options}) {
    this.tree = tree
    this.options = options || {}
    this.fullTreePath = new Map()
    this.getFullTreePath(this.tree, this.fullTreePath)
    this.fullTreePathList = Array.from(this.fullTreePath.keys()).filter(_ => _)
    this.topLevelPath = this.fullTreePathList.filter(_ => !(_.includes('@')||_.includes('.')||_.includes('>')))
  }
  getFullTreePath (tree, paths) {
    paths.set(tree.path, tree)
    if (tree.children) {
      for (let child of tree.children) {
        this.getFullTreePath(child, paths)
      }
    }
  }
  parse (content) {
    let result
    try {
      result = JsonParse(content)
    } catch (e) {
      if (e instanceof SyntaxError) {
        let start = e.location.start.offset
        let end   = e.location.end.offset
        let expected = e.expected
        let before = content.slice(0, start)
        let after = content.slice(start)
        let error = new ParseError(start, end, expected, before, after)
        this.error = error
        throw error
      } else {
        this.error = e
        throw e
      }
    }
    this.result = result
    this.error = null
  }
  _simpleResult (tree) {
    if (!tree.type && !tree.valueType) return tree
    let result = {}
    //if (tree.string) result.string = tree.string
    if (tree.type) result.type = tree.type
    if (tree.key) result.key = this._simpleResult(tree.key)
    if (tree.valueType) result.valueType = tree.valueType
    if (tree.value) {
      if (Array.isArray(tree.value)) {
        result.value = tree.value.map(_ => this._simpleResult(_))
      } else {
        result.value = this._simpleResult(tree.value)
      }
    }
    return result
  }
  simpleResult () {
    return this._simpleResult(this.result)
  }
  getCursorObjects (cursor, tree, trace) {
    const keys = ['index','inside','type','valueType','start','end','string']
    if (tree.start<=cursor && cursor<=tree.end) {
      if (trace.length&&trace[trace.length-1].end===tree.start) return
      let toPush = _.omit(tree, ['value', 'key'])
      if (tree.key) toPush.key = _.pick(tree.key, keys)
      if (tree.value||!Array.isArray(tree.value)) toPush.value = _.pick(tree.value, keys)
      trace.push(toPush)
      if (Array.isArray(tree.value)) {
        for (let each of tree.value) {
          this.getCursorObjects(cursor, each, trace)
        }
      } else {
        if (tree.value.type || tree.value.valueType) {
          this.getCursorObjects(cursor, tree.value, trace)
        }
      }
      if (tree.key) {
        this.getCursorObjects(cursor, tree.key, trace)
      }
    }
  }
  analysis (cursor) {
    if (!this.result) throw Error('should do parse first!')
    this.trace = []
    this.getCursorObjects(cursor, this.result, this.trace)
    this.trace = this.trace.reverse()
    console.log({cursor, result: this.result, trace: this.trace})
    let trace = this.trace[0]
    let result, completeData, completeType, start, end, string, range, options
    options = {}
    if (!trace.type) { // inside a value
      completeType = 'replace'
      string = trace.string
      range = {start: trace.start, end: trace.end, color: 'rgba(0,255,0,0.2)'}
      completeData = [
        {
          group: `replacing: ${trace.valueType}`,
          always: true,
        }
      ]
    } else { // in some ws
      completeType = 'insert'
      range = null
      completeData = [ ]
      string = ""
      if (trace.type === 'pair' && trace.subtype === 'complete' && cursor > trace.key.end && cursor < trace.value.start) {
        // no complete not between key: value
      } else if (trace.badPositions && trace.badPositions.includes(cursor)) {
        // no complete not between "&&" nad "||"
      } else if (['nested', 'array', 'object'].includes(trace.type) && (cursor===trace.start || cursor===trace.end)) {
        range = {start: trace.start, end: trace.end, color: 'rgba(0,255,0,0.2)'} // only show the range, no complete
      } else {
        range = {start: cursor, end: cursor}
        if (['root', 'andItem', 'orItem', 'objectItem', 'arrayItem'].includes(trace.type)) {
          completeData = [
            {
              group: `commands`,
              data: [
                {data: '@js', description: 'arbitary js code'},
                {data: '@and', description: 'and logical structure'},
                {data: '@or', description: 'or logical structure'},
                {data: '@not', description: 'not logical structure'},
              ]
            },
            {
              group: `paths`,
              data: this.topLevelPath,
            }
          ]
          options = {
            maxDrop: 10
          }
        } else {
          completeData = [
            {
              group: `inserting: ${trace.type}`,
              always: true,
            }
          ]
        }
      }
    }
    result = {
      range,
      string,
      completeData,
      options,
    }
    return result
  }
}

//module.exports =
export default {
  parse: JsonParse,
  SyntaxError,
  Parser,
}
