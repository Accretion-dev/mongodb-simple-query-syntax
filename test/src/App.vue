<template>
  <div id="app" :class="clsPrefix">
    <h1> Test enviroment for mongodb-simple-query-syntax</h1>
    <test-env>
      <test-block title="Test syntax analysis" name="syntax" id="syntax-id" :fold="true">
        <parse-test-pre :content="testData.simple.content" :contentObj="testData.simple.contentObj"/>
      </test-block>
    </test-env>
  </div>
</template>

<script>
const clsPrefix = 'test-env'
const path = require('path')
const {SyntaxError, parse, Tracer} = require('../../index.js')
import lodash from 'lodash'
import equal from 'deep-equal'
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff'
import parseTestPre from './component/parseTestPre.vue'

let testData = {
  simple: {
    content:  `
      $title|startsWith: 'foo bar' ||
      'tags'|elemMatch:{tagname|startsWith: astro, time|lt: } ||
      tags.tag_name: 'good' && ~(tags.time|lt: '2018') ||
      tags.tag_name|in:[
        foo, bar, 'a\\'b', {foo:bar},
      ] ||
      halftype: ||
      regtest: /^[\\u4E00-\\u9FA5A-Za-z0-9]+ [a-zA-Z0-9][-a-zA-Z0-9]{0,62}(.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+ \\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$/ ||
      flags|:flag  ||
      simple|level1|level2|level3 : s123 ||
      simple|level1|level2| : s12$ ||
      simple|level1|level2| : ||
      ~not|level|test| : ||
      (foo:foo && bar:bar || ~foobar:foobar && barfoo:barfoo) ||
      ( (unfinished0) unfinished1) ||
      'unfinished2' ||
      unfinished3: {
        unfinished4,
        'undefined%5',
        unfinished6: ,
        unfinished7|op8|:,
        level1|in: { level2|in|in: { level3|in|in|in: good}},
      }`,
    contentObj: {$or: [
      {$title: {$startsWith: 'foo bar'}},
      {tags: {$elemMatch: {
        tagname: {$startsWith: 'astro'},
        time: {$lt: null}
      }}},
      {$and: [
        {'tags.tag_name': 'good'},
        {$not: {'tags.time': {$lt: '2018'}}},
      ]},
      {'tags.tag_name':{$in:['foo', 'bar', 'a\'b', {foo:'bar'}]}},
      {halftype: null},
      {regtest: /^[\u4E00-\u9FA5A-Za-z0-9]+ [a-zA-Z0-9][-a-zA-Z0-9]{0,62}(.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+ \w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/},
      {flags:{$:'flag'}},
      {simple:{$level1:{$level2:{$level3: 's123'}}}},
      {simple:{$level1:{$level2:{$: 's12$'}}}},
      {simple:{$level1:{$level2:{$: null}}}},
      {$not:{not: {$level:{$test:{$: null}}}}},
      {$or: [
        {$and: [{foo:"foo"}, {bar:"bar"}]},
        {$and: [{$not: {foobar:"foobar"}}, {barfoo: "barfoo"}]}
      ]},
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
  }
}


export default {
  name: 'test-app',
  components: {parseTestPre},
  data () {
    return {
      clsPrefix,
      lodash,
      cursor: 0,
      testData,
      timer:{move: null},
    }
  },
  computed: {
  },
  methods: {
  }
}
</script>

<style lang="scss">
$pre: test-env;
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
