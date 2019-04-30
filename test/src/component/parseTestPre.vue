<template>
  <div :class="clsPrefix">
    <input id='input'
           v-model="cursor"
           placeholder="value"
           @keydown.right.prevent="cursor = Number(cursor) + 1"
           @keydown.left.prevent="cursor = Number(cursor) - 1"
    />
    <button class="value" @click="cursor = Number(cursor) - 1" id='minus'> - </button>
    <button class="value" @click="cursor = Number(cursor) + 1" id='plus'> + </button>
    <template v-if="debug">
      <template v-if="typeof(debug.analysis.print)==='string'">
        <pre ref="pre"
            @click="onClick"
             @keydown.right="onMove"
             @keydown.left="onMove"
             @keydown.up="onMove"
             @keydown.down="onMove"
            contenteditable="true"
        >{{debug.analysis.print}}</pre>
      </template>
      <template v-else>
        <pre ref="pre"
             @click="onClick"
             @keydown.right="onMove"
             @keydown.left="onMove"
             @keydown.up="onMove"
             @keydown.down="onMove"
             contenteditable="true"
        >{{debug.analysis.print.head}}<span class='highlight'>{{debug.analysis.print.middle}}</span>{{debug.analysis.print.tail}}</pre>
      </template>
      <pre>analysis: {{JSON.stringify(lodash.pick(debug.analysis, ['type', 'complete', 'valueType', 'result']))}}</pre>
      <pre>extract: {{JSON.stringify(debug.analysis.extract)}}</pre>
      <pre>path:    {{JSON.stringify(debug.autocomplete.path)}}</pre>
      <template v-if="debug.analysis.printKey">
        <template v-if="typeof(debug.analysis.printKey)==='string'">
          <pre>{{debug.analysis.printKey}}</pre>
        </template>
        <template v-else>
          <pre>{{debug.analysis.printKey.head}}<span class='highlight'>{{debug.analysis.printKey.middle}}</span>{{debug.analysis.printKey.tail}}</pre>
        </template>
      </template>
    </template>
  </div>
</template>

<script>
const clsPrefix = 'parse-test-pre'
const path = require('path')
const {SyntaxError, parse, Tracer, Parser} = require('../../../index.js')
import lodash from 'lodash'
import equal from 'deep-equal'
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff'

export default {
  name: 'parse-test-pre',
  props: {
    content: {
      type: String,
      default: '',
    },
    struct: {
      type: Object,
      default: null,
    },
    contentObj: {
      type: Object,
      default: null,
    }
  },
  data () {
    return {
      parser: null,
      clsPrefix,
      lodash,
      cursor: 0,
      timer:{move: null},
    }
  },
  computed: {
    debug () {
      if (!this.parser) return null
      let result = this.parser.analysis(this.cursor)
      let sel = window.getSelection()
      let range = document.createRange()
      let pre = this.$refs.pre
      if (pre) {
        this.$nextTick(() => {
          if (typeof(result.analysis.print) === 'string') {
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
      return result
    }
  },
  created () {
    this.$watch('content', this.onChangeInput)
    this.$watch('struct', this.onChangeInput)
    this.onChangeInput()
  },
  methods: {
    onChangeInput () {
      this.parser = new Parser({struct: this.struct, options:{print: true, logFull: false}})
      let result = this.parser.parse({content: this.content})
      if (!equal(result, this.contentObj)) {
        console.log({expect: this.contentObj, actual: result})
        console.log(diff(result, this.contentObj))
        throw Error('parse error')
      }
    },
    onMove () {
      clearTimeout(this.timer.move)
      this.timer.move = setTimeout(() => {
        this.onClick()
      }, 500)
    },
    onClick (event) {
      let sel = window.getSelection()
      let offset = sel.focusOffset
      let pre = this.$refs.pre
      let nodes = pre.childNodes
      if (!nodes.length) {
        this.cursor = offset
      } else {
        let index = Array.from(nodes).findIndex(_ => _===sel.focusNode)
        if (index === 0) {
          this.cursor = offset
        } else if (index === 2){
          this.cursor = offset + nodes[0].data.length + nodes[1].innerText.length - 2
        } else {
          let text = sel.focusNode.data
          if (text.slice(0,sel.focusOffset).indexOf('◼️')>=0) {
            this.cursor = offset + nodes[0].data.length - 2
          } else {
            this.cursor = offset + nodes[0].data.length
          }
        }
      }
    }
  }
}
</script>

<style lang="scss">
</style>