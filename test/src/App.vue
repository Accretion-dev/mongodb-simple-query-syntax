<template>
  <div id="app" :class="clsPrefix">
    <h1> Test enviroment for mongodb-simple-query-syntax</h1>
    <test-env>
      <test-block title="Test syntax analysis" name="syntax" id="syntax-id">
        <div>
          <input id='input'
                 v-model="cursor"
                 placeholder="value"
                 @keydown.right.prevent="cursor = Number(cursor) + 1"
                 @keydown.left.prevent="cursor = Number(cursor) - 1"
          />
          <button class="value" @click="cursor = Number(cursor) - 1" id='minus'> - </button>
          <button class="value" @click="cursor = Number(cursor) + 1" id='plus'> + </button>
          <pre>output: {{JSON.stringify(lodash.pick(debug.output, ['type', 'complete', 'valueType', 'start', 'end', 'lastEnd', 'extract', 'result']))}}</pre>
          <template v-if="debug.error">
            <pre>{{debug.error}}</pre>
          </template>
          <template v-else>
            <template v-if="typeof(debug.output.print)==='string'">
              <pre ref="pre" @click="onClick"  contenteditable="true">{{debug.output.print}}</pre>
            </template>
            <template v-else>
              <pre ref="pre" @click="onClick" contenteditable="true">{{debug.output.print.head}}<span class='highlight'>{{debug.output.print.middle}}</span>{{debug.output.print.tail}}</pre>
            </template>
            <template v-if="debug.output.printKey">
              <template v-if="typeof(debug.output.printKey)==='string'">
                <pre>{{debug.output.printKey}}</pre>
              </template>
              <template v-else>
                <pre>{{debug.output.printKey.head}}<span class='highlight'>{{debug.output.printKey.middle}}</span>{{debug.output.printKey.tail}}</pre>
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
import lodash from 'lodash'

let todo, todoObj
todo = `
  $title|startsWith: 'foo bar' ||
  'tags'|elemMatch:{tagname|startsWith: astro, time|lt: } ||
  tags.tag_name: 'good' && ~(tags.time|lt: '2018') ||
  tags.tag_name|in:[
    foo, bar, 'a\\'b', {foo:bar},
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
  {$title: {$startsWith: 'foo bar'}},
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
      lodash,
      cursor: 0,
    }
  },
  computed: {
    debug () {
      let tracer = new Tracer({content: todo})
      let result, output
      try {
        result = parse(todo, {tracer})
        output = tracer.getAutocompleteType(this.cursor)
      } catch (e) {
        return {error: e}
      }
      let sel = window.getSelection()
      let range = document.createRange()
      let pre = this.$refs.pre
      if (pre) {
        this.$nextTick(() => {
          if (typeof(output.print) === 'string') {
            range.setStart(pre.childNodes[0], this.cursor)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          } else {
            let offset = this.cursor - pre.childNodes[0].length
            range.setStart(pre.childNodes[1].childNodes[0], offset)
            range.collapse(true)
            sel.removeAllRanges()
            sel.addRange(range)
          }
        })
      }
      return {result, output}
    }
  },
  methods: {
    onClick (event) {
      let sel = window.getSelection()
      let offset = sel.focusOffset
      let pre = this.$refs.pre
      let nodes = pre.childNodes
      if (!nodes.length) {
        this.cursor = offset
      } else {
        let index = Array.from(nodes).findIndex(_ => _===sel.focusNode)
        console.log(index)
        if (index === 0) {
          this.cursor = offset
        } else if (index === 2){
          this.cursor = offset + nodes[0].data.length + nodes[1].innerText.length - 2
        } else {
          let text = sel.focusNode.data
          if (text.indexOf('◼️')>=0) {
            this.cursor = offset + nodes[0].data.length - 2
          } else {
            this.cursor = offset + nodes[0].data.length - 1
          }
        }
      }
    }
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
