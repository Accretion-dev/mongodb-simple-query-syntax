<template>
  <div id="app" :class="clsPrefix">
    <h1> Test enviroment for mongodb-simple-query-syntax</h1>
    <test-env>
      <test-block title="Test syntax analysis" name="syntax" id="syntax-id">
        <parse-test-pre :content="testData.simple.content" :contentObj="testData.simple.contentObj" :struct="demoStruct"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test syntax analysis" name="syntax" id="syntax-id" :fold="true" :struct="demoStruct">
        <parse-test-pre :content="testData.simple.content" :contentObj="testData.simple.contentObj"/>
      </test-block>
    </test-env>
  </div>
</template>

<script>
const clsPrefix = 'test-env'
const path = require('path')
const {demoStruct} = require('../../index.js')
import lodash from 'lodash'
import equal from 'deep-equal'
import { diff, addedDiff, deletedDiff, updatedDiff, detailedDiff } from 'deep-object-diff'
import parseTestPre from './component/parseTestPre.vue'

let demoStr = `
(string: testString || string: "testString") ||
(number: 23333 ||
date: '12:33:12'
date: '20190412' ||
date: '20190412T12:33:12' ||
date: '20190412T12:33:12Z' ||
date: '20190412T12:33:12+8' ||
array_number: 123 ||
array_number: [123,321] ||
`

let testData = {
  simple: {
    content:  `
      $title|startsWith: 'foo bar' ||
      'tags'|elemMatch:{tagname|startsWith: astro, time|lt: } ||
      tags.tag_name: 'good' && (tags.time|lt: '2018') ||
      tags.tag_name|in:[
        foo, bar, 'a\\'b', {foo:bar},
      ] ||
      halftype: ||
      regtest: /^[\\u4E00-\\u9FA5A-Za-z0-9]+ [a-zA-Z0-9][-a-zA-Z0-9]{0,62}(.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+ \\w+([-+.]\\w+)*@\\w+([-.]\\w+)*\\.\\w+([-.]\\w+)*$/ ||
      flags|:flag  ||
      simple|level1|level2|level3 : s123 ||
      simple|level1|level2| : s12$ ||
      simple|level1|level2| :||
      not|level|test|not| : ||
      test.more.than.extra|one|space| :    ||
      'string.more.than.extra'|one|space| :    ||
      (foo:foo && bar:bar || foobar:foobar && barfoo:barfoo) ||
      ( (unfinished0) unfinished1) ||
      'unfinished2' ||
      unfinished3: {
        part,
        partDot.,
        partOP|,
        partOP1|op|op|,
        partOP2.nice.good.great|op|op|,
        'u%5',
        u6: ,
        u7|op8|:,
        level1|in: { level2.stack|in|in: { level3|in|in|in: good}},
      } ||
      part||partgood:good||
      partDot. ||
      partOP| ||
      partOP1|op|op| ||
      partOP2.nice.good.great|op|op|: [
        123, {inner.region|in:[
          456, {inner.inner|in: 567}
        ]}
      ]
      `,
    contentObj: {$or: [
      {$title: {$startsWith: 'foo bar'}},
      {tags: {$elemMatch: {
        tagname: {$startsWith: 'astro'},
        time: {$lt: null}
      }}},
      {$and: [
        {'tags.tag_name': 'good'},
        {'tags.time': {$lt: '2018'}},
      ]},
      {'tags.tag_name':{$in:['foo', 'bar', 'a\'b', {foo:'bar'}]}},
      {halftype: null},
      {regtest: /^[\u4E00-\u9FA5A-Za-z0-9]+ [a-zA-Z0-9][-a-zA-Z0-9]{0,62}(.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+ \w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/},
      {flags:{$:'flag'}},
      {simple:{$level1:{$level2:{$level3: 's123'}}}},
      {simple:{$level1:{$level2:{$: 's12$'}}}},
      {simple:{$level1:{$level2:{$: null}}}},
      {not: {$level:{$test:{$not: {$: null}}}}},
      {'test.more.than.extra':{$one:{$space:{$: null}}}},
      {'string.more.than.extra':{$one:{$space:{$: null}}}},
      {$or: [
        {$and: [{foo:"foo"}, {bar:"bar"}]},
        {$and: [{foobar:"foobar"}, {barfoo: "barfoo"}]}
      ]},
      {$and: ['unfinished0', 'unfinished1']},
      'unfinished2',
      {unfinished3: {
        part: null,
        'partDot.': null,
        partOP: {$: null},
        partOP1: {$op: {$op: {$:null}}},
        'partOP2.nice.good.great': {$op: {$op: {$:null}}},
        'u%5': null, u6: null, u7: {$op8: {$: null}},
        level1: { $in:{
          'level2.stack': {
            $in:{ $in:{
              level3: {$in:{$in:{$in: 'good' }}}
            } }
          } }
        },
      }},
      'part',
      {partgood: 'good'},
      {'partDot.': null},
      {partOP:{$:null}},
      {partOP1:{$op:{$op:{$:null}}}},
      {'partOP2.nice.good.great':{$op:{$op: {$: [
        123, {'inner.region':{$in: [
          456, {'inner.inner': {$in: 567}}
        ]}}
      ]}}}},
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
      demoStr,
      demoStruct,
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
