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
  constructor ({tree, options, treeAnalyser}) {
    this.treeAnalyser = treeAnalyser
    this.tree = this.treeAnalyser.tree
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
    if (tree.start<=cursor && cursor<=tree.end) {
      if (trace.length&&trace[trace.length-1].end===tree.start) return
      trace.push(tree)
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
  getContext (trace) {
    // bottom up
    if (!trace.length) return null
    // type could be root, key and value
    let type, valueType, value, completeKey, completeKeyFull
    if (trace[0].valueType) {
      type = 'value'
      valueType = trace[0].valueType
      value = trace[0].string
    }
    let keys =[]
    for (let each of trace) {
      if (each.type === 'key') {
        type = each.type
        value = each.value.string
      }
      if (each.type === 'pair') {
        keys.push(each.key.value.value)
      }
    }
    if (!type) type = 'root'
    keys = keys.reverse()
    if (type==='key') keys.pop()

    if (trace[0].subtype === 'missingValue') {
      type = 'value'
      valueType = 'missingValue'
      value = ''
    }

    let subkeys = []
    for (let each of keys) {
      let eachsubkeys = each.split('|')
      subkeys.push(eachsubkeys[0])
      if (eachsubkeys.length>1) {
        subkeys = subkeys.concat(eachsubkeys.slice(1).map(_ => '@'+_))
      }
    }

    /* operators
     * logical operators: @and, @or, @not,
     *  length operators: @len, @wlen,
     *   array operators: @every, @any,
     *   other operators: @js,
    */
    let keyPrefixs = subkeys.filter(_ => !['@and', '@or', '@not', '@any', '@every'].includes(_))
    let keyPrefix = keyPrefixs.join('')
    let completeData = []

    if (type === 'root') { // 'insert' mode
      if (keys.length===0) {
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
            always: true,
          }
        ]
      } else { // nested keys
        let nestedPaths = this.fullTreePathList.filter(_ => _.startsWith(keyPrefix))
        if (nestedPaths.length) {
          nestedPaths = nestedPaths.map(_ => _.slice(keyPrefix.length))
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
              group: `${keyPrefix}`,
              data: nestedPaths,
              always: true,
            }
          ]
        } else {
          completeData = [
            {
              group: `unknown prefix: ${keyPrefix}`,
              always: true,
            }
          ]
        }
      }
    } else if (type === 'key' || type === 'value' && keys.length===0) { // 'replace' mode
      completeKey = value.split('|')[0]
      if (keys.length>0) { // value in root, should be the same as 'root inseart'
        completeKeyFull = keyPrefix + completeKey
      } else {
        completeKeyFull = completeKey
      }
      let thisKeys = this.fullTreePathList.filter(_ => _.startsWith(completeKeyFull))
      if (thisKeys.includes(completeKeyFull)) { // add suffix commands for it
        let trueValueType = this.treeAnalyser.getTypeByPath(completeKeyFull)
        let extraData = {
          group: `unknown: ${completeKey}`,
          data: [],
          always: true,
        }
        if (trueValueType) {
          let thisExtraData = []
          extraData.group = `${trueValueType.type}: [${completeKeyFull}]`
          let completeKeyPrefixs = [
            `${completeKey}`,
          ]
          if (completeKey.includes('>')) { // value is an array
            completeKeyPrefixs = completeKeyPrefixs.concat([
            `${completeKey}|any`,
            `${completeKey}|every`,
            ])
          }
          if (trueValueType.type === 'array' || trueValueType.type === 'object') {
            for (let completeKeyPrefix of completeKeyPrefixs) {
              thisExtraData = thisExtraData.concat([
                {data: `${completeKeyPrefix}|js: ""`, description: 'js filter for obj length', cursorOffset: -1},
                {data: `${completeKeyPrefix}|len: ""`, description: 'number filter obj length', cursorOffset: -1},
                {data: `${completeKeyPrefix}|exists: `, description: ''},
              ])
            }
          } else if (trueValueType.type === 'string') {
            for (let completeKeyPrefix of completeKeyPrefixs) {
              thisExtraData = thisExtraData.concat([
                {data: `${completeKeyPrefix}: ""`, description: 'exact match', cursorOffset: -1},
                {data: `${completeKeyPrefix}: //`, description: 'regexp', cursorOffset: -1},
                {data: `${completeKeyPrefix}|js: ""`, description: 'js filter', cursorOffset: -1},
                {data: `${completeKeyPrefix}|len: ""`, description: 'number filter for string length', cursorOffset: -1},
                {data: `${completeKeyPrefix}|wlen: ""`, description: 'number filter for string word length', cursorOffset: -1},
                {data: `${completeKeyPrefix}|exists: `, description: ''},
              ])
            }
          } else if (trueValueType.type === 'date') {
            for (let completeKeyPrefix of completeKeyPrefixs) {
              thisExtraData = thisExtraData.concat([
                {data: `${completeKeyPrefix}: ""`, description: 'date filter', cursorOffset: -1},
                {data: `${completeKeyPrefix}|js: ""`, description: 'js filter for date', cursorOffset: -1},
                {data: `${completeKeyPrefix}|exists: `, description: ''},
              ])
            }
          } else if (trueValueType.type === 'number') {
            for (let completeKeyPrefix of completeKeyPrefixs) {
              thisExtraData = thisExtraData.concat([
                {data: `${completeKeyPrefix}: ""`, description: 'number filter', cursorOffset: -1},
                {data: `${completeKeyPrefix}|js: ""`, description: 'js filter for number', cursorOffset: -1},
                {data: `${completeKeyPrefix}|exists: `, description: ''},
              ])
            }
          } else if (trueValueType.type === 'mixed') {
            for (let completeKeyPrefix of completeKeyPrefixs) {
              thisExtraData = thisExtraData.concat([
                {data: `${completeKeyPrefix}@: `, description: ''},
                {data: `${completeKeyPrefix}|js: ""`, description: 'js filter for number', cursorOffset: -1},
                {data: `${completeKeyPrefix}|exists: `, description: ''},
              ])
            }
          } else {
            for (let completeKeyPrefix of completeKeyPrefixs) {
              thisExtraData = thisExtraData.concat([
                {data: `${completeKeyPrefix}|js: ""`, description: 'js filter for number', cursorOffset: -1},
                {data: `${completeKeyPrefix}|exists: `, description: ''},
              ])
            }
          }
          extraData.data = thisExtraData
        }
        completeData = [
          {
            group: `commands`,
            data: [
              {data: '@js', description: 'arbitary js code'},
            ]
          },
          extraData,
          {
            group: `Paths:`,
            data: this.fullTreePathList,
            always: true,
          }
        ]
      } else { // just show the keys
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
            group: `Paths:`,
            data: this.fullTreePathList,
            always: true,
          }
        ]
      }
    } else { // type === 'value' && keys.length > 0
      let key = keyPrefix
      if (key.endsWith('@exists')) {
        completeData = [
          {
            group: `true or false`,
            always: true
          },
        ]
      } else if (key.endsWith('@len') || key.endsWith('@wlen')) {
        completeData = [
          {
            group: `number filter`,
            always: true
          },
        ]
      } else if (key.endsWith('@js')) {
        completeData = [
          {
            group: `js filter`,
            always: true
          },
        ]
      } else {
        completeKey = key.split('|')[0]
        let trueValueType = this.treeAnalyser.getTypeByPath(completeKey)
        if (trueValueType) {
          let column = this.treeAnalyser.getValueByPath(this.treeAnalyser.data, completeKey)
          let length
          if (column) {
            if (Array.isArray(column)) {
              length = column.length
            } else {
              length = 1
            }
          } else {
            length = 'undefined'
          }
          completeData = [
            {
              group: `type: ${trueValueType.type} (${length})`,
              always: true
            },
          ]
        } else {
          completeData = [
            {
              group: `unknown type...`,
              always: true
            },
          ]
        }
      }
    }
    console.log({completeKey})
    return {type, string:value, completeData, keys, keyPrefix}
  }
  analysis (cursor) {
    if (!this.result) throw Error('should do parse first!')
    this.trace = []
    this.getCursorObjects(cursor, this.result, this.trace)
    this.trace = this.trace.reverse()
    let options = {maxDrop: 30}
    let {type, string, completeData, keys, keyPrefix} = this.getContext(this.trace)
    let trace = this.trace[0]
    let result, completeType, start, end, range
    if (!trace) {
      range = null
      completeData = [ ]
      string = ""
    } else if (!trace.type) { // inside a value
      completeType = 'replace'
      string = trace.string
      range = {start: trace.start, end: trace.end, color: 'rgba(0,255,0,0.2)'}
      /*
      completeData = [
        {
          group: `replacing: ${trace.valueType}`,
          always: true,
        }
      ]
      */
    } else { // in some ws
      completeType = 'insert'
      range = null
      string = ""
      if (trace.type === 'pair' && trace.subtype === 'complete' && cursor > trace.key.end && cursor < trace.value.start) {
        // no complete not between key: value
        completeData = [ ]
      } else if (trace.badPositions && trace.badPositions.includes(cursor)) {
        // no complete not between "&&" nad "||"
        completeData = [ ]
      } else if (['nested', 'array', 'object'].includes(trace.type) && (cursor===trace.start || cursor===trace.end)) {
        completeData = [ ]
        // only show the range, no complete
        range = {start: trace.start, end: trace.end, color: 'rgba(0,255,0,0.2)'}
      } else {
        range = {start: cursor, end: cursor}
        // insert top level expresion
        /*
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
        */
      }
    }
    console.log({cursor, keys, keyPrefix, type, string, completeData, options, trace})
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
