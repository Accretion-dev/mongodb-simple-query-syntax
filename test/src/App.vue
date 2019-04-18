<template>
  <div id="app" :class="clsPrefix">
    <h1> Test enviroment for mongodb-simple-query-syntax</h1>
    <test-env>
      <test-block title="Test syntax analysis" name="syntax" id="syntax-id">
        <div>
          <input id='input'
                 v-model="cursor"
                 placeholder="value"
                 @keydown.up.prevent="cursor += 1"
                 @keydown.down.prevent="cursor -= 1"
          />
          <button class="value" @click="cursor -= 1" id='minus'> - </button>
          <button class="value" @click="cursor += 1" id='plus'> + </button>
          <pre>output: {{JSON.stringify(debug.output)}}</pre>
          <template v-if="debug.error">
            <pre>{{debug.error}}</pre>
          </template>
          <template v-else>
            <template v-if="typeof(debug.debugInfo.toPrint)==='string'">
              <pre>{{debug.debugInfo.toPrint}}</pre>
            </template>
            <template v-else>
              <pre>{{debug.debugInfo.toPrint.head}}<span class='highlight'>{{debug.debugInfo.toPrint.middle}}</span>{{debug.debugInfo.toPrint.tail}}</pre>
            </template>
            <template v-if="debug.debugInfo.toPrint2">
              <template v-if="typeof(debug.debugInfo.toPrint2)==='string'">
                <pre>{{debug.debugInfo.toPrint2}}</pre>
              </template>
              <template v-else>
                <pre>{{debug.debugInfo.toPrint2.head}}<span class='highlight'>{{debug.debugInfo.toPrint2.middle}}</span>{{debug.debugInfo.toPrint2.tail}}</pre>
              </template>
            </template>
          </template>
        </div>
      </test-block>
    </test-env>
  </div>
</template>

<script>
const clsPrefix = 'vue-selenium-unittest'
const path = require('path')
const {SyntaxError, parse, Tracer} = require('../../index.js')

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

export default {
  name: 'app',
  data () {
    return {
      clsPrefix,
      cursor: 0,
    }
  },
  computed: {
    debug () {
      let tracer = new Tracer({content: todo, simple: true})
      let result, debugResult
      try {
        result = parse(todo, {tracer})
        debugResult = tracer.getAutocompleteType(this.cursor, true)
      } catch (e) {
        return {error: e}
      }
      return {result, output:debugResult.output, debugInfo: debugResult.debugInfo}
    }
  },
  methods: {
  }
}
</script>

<style lang="scss">
$pre: vue-selenium-unittest;
.#{$pre} h1 {
  text-align: center;
}
.test-title {
  font-weight: bolder;
}
input {
  width: 30px;
}
.iview-button {
  padding: 3px;
  margin: 5px;
}
button.value {
  width: 20px;
}
.highlight {
  background-color:#41ff418c;
}
.insert {
  color: red;
}
</style>
