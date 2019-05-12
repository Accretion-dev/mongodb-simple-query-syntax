<template>
  <div id="app" :class="clsPrefix">
    <h1> Test enviroment for mongodb-simple-query-syntax</h1>
    <test-env>
      <test-block title="Test syntax analysis" name="syntax" id="syntax-id">
        <parse-test-pre :content="testData.simple.content" :contentObj="testData.simple.contentObj"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test simple search0" name="search0" id="search0-id" :fold="false">
        <parse-test-pre :content="testData.search0.content" :contentObj="testData.search0.contentObj" :struct="dbstruct.Article" :debuglog="true"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test simple search1" name="search1" id="search1-id" :fold="false">
        <parse-test-pre :content="testData.search1.content" :contentObj="testData.search1.contentObj" :struct="dbstruct.Article"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test Article" name="Article" id="Article-id" :fold="false">
        <parse-test-pre :content="testData.Article.content" :contentObj="testData.Article.contentObj" :struct="dbstruct.Article"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test Tag" name="Tag" id="Tag-id" :fold="false">
        <parse-test-pre :content="testData.Tag.content" :contentObj="testData.Tag.contentObj" :struct="dbstruct.Tag"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test Catalogue" name="Catalogue" id="Catalogue-id" :fold="false">
        <parse-test-pre :content="testData.Catalogue.content" :contentObj="testData.Catalogue.contentObj" :struct="dbstruct.Catalogue"/>
      </test-block>
    </test-env>
    <test-env>
      <test-block title="Test incomplete" name="incomplete" id="incomplete-id" :fold="false">
        <parse-test-pre :content="testData.incomplete.content" :struct="dbstruct.Article"/>
      </test-block>
    </test-env>
  </div>
</template>

<script>
const clsPrefix = 'test-env'
const path = require('path')
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

const dbstruct = {
  Article:{"type":"object","fields":{"title":{"path":"title","type":"string"},"author":{"path":"author","type":"string"},"editor":{"path":"editor","type":"string"},"abstract":{"path":"abstract","type":"string"},"type":{"path":"type","type":"string"},"content":{"path":"content","type":"string"},"tags":{"type":"object","fields":{"tag_id":{"path":"tags.tag_id","type":"number"},"tag_name":{"path":"tags.tag_name","type":"string"},"_id":{"path":"tags._id","type":"id"},"flags":{"path":"tags.flags","type":"object"},"id":{"path":"tags.id","type":"number"},"comment":{"path":"tags.comment","type":"string"},"origin":{"path":"tags.origin","array":true,"type":"object"},"ctime":{"path":"tags.ctime","type":"date"},"mtime":{"path":"tags.mtime","type":"date"}},"path":"tags","array":true,"primary_key":"tag_name"},"catalogues":{"type":"object","fields":{"catalogue_id":{"path":"catalogues.catalogue_id","type":"number"},"catalogue_name":{"path":"catalogues.catalogue_name","type":"string"},"_id":{"path":"catalogues._id","type":"id"},"flags":{"path":"catalogues.flags","type":"object"},"id":{"path":"catalogues.id","type":"number"},"comment":{"path":"catalogues.comment","type":"string"},"origin":{"path":"catalogues.origin","array":true,"type":"object"},"ctime":{"path":"catalogues.ctime","type":"date"},"mtime":{"path":"catalogues.mtime","type":"date"}},"path":"catalogues","array":true,"primary_key":"catalogue_name"},"relations":{"type":"object","fields":{"relation_id":{"path":"relations.relation_id","type":"number"},"relation_name":{"path":"relations.relation_name","type":"string"},"parameter":{"path":"relations.parameter","type":"object"},"from_model":{"path":"relations.from_model","type":"string"},"from_id":{"path":"relations.from_id","type":"number"},"to_model":{"path":"relations.to_model","type":"string"},"to_id":{"path":"relations.to_id","type":"number"},"other_model":{"path":"relations.other_model","type":"string"},"other_id":{"path":"relations.other_id","type":"number"},"aorb":{"path":"relations.aorb","type":"string"},"other_aorb":{"path":"relations.other_aorb","type":"string"},"_id":{"path":"relations._id","type":"id"},"flags":{"path":"relations.flags","type":"object"},"id":{"path":"relations.id","type":"number"},"comment":{"path":"relations.comment","type":"string"},"origin":{"path":"relations.origin","array":true,"type":"object"},"ctime":{"path":"relations.ctime","type":"date"},"mtime":{"path":"relations.mtime","type":"date"}},"path":"relations","array":true,"primary_key":"relation_name"},"fathers":{"type":"object","fields":{"id":{"path":"fathers.id","type":"number"},"_id":{"path":"fathers._id","type":"id"},"origin":{"path":"fathers.origin","array":true,"type":"object"}},"path":"fathers","array":true},"children":{"type":"object","fields":{"id":{"path":"children.id","type":"number"},"_id":{"path":"children._id","type":"id"},"origin":{"path":"children.origin","array":true,"type":"object"}},"path":"children","array":true},"metadatas":{"type":"object","fields":{"metadata_id":{"path":"metadatas.metadata_id","type":"number"},"metadata_name":{"path":"metadatas.metadata_name","type":"string"},"value":{"path":"metadatas.value","type":"object"},"_id":{"path":"metadatas._id","type":"id"},"flags":{"path":"metadatas.flags","type":"object"},"id":{"path":"metadatas.id","type":"number"},"comment":{"path":"metadatas.comment","type":"string"},"origin":{"path":"metadatas.origin","array":true,"type":"object"},"ctime":{"path":"metadatas.ctime","type":"date"},"mtime":{"path":"metadatas.mtime","type":"date"}},"path":"metadatas","array":true,"primary_key":"metadata_name"},"flags":{"path":"flags","type":"object"},"user":{"path":"user","fields":{"username":{"path":"user.username","type":"string"}},"type":"object"},"id":{"path":"id","type":"number"},"comment":{"path":"comment","type":"string"},"origin":{"path":"origin","array":true,"type":"object"},"ctime":{"path":"ctime","type":"date"},"mtime":{"path":"mtime","type":"date"},"mmtime":{"path":"mmtime","type":"date"},"mctime":{"path":"mctime","type":"date"},"_id":{"path":"_id","type":"id"}},"root":"Article","searchKey":["title","author","editor","abstract","tags.tag_name","catalogues.catalogue_name","relations.relation_name","metadatas.metadata_name","comment"]},
  Tag:{"type":"object","fields":{"name":{"path":"name","type":"string"},"type":{"path":"type","type":"string"},"description":{"path":"description","type":"string"},"display_name":{"path":"display_name","type":"string"},"relations":{"type":"object","fields":{"relation_id":{"path":"relations.relation_id","type":"number"},"relation_name":{"path":"relations.relation_name","type":"string"},"parameter":{"path":"relations.parameter","type":"object"},"from_model":{"path":"relations.from_model","type":"string"},"from_id":{"path":"relations.from_id","type":"number"},"to_model":{"path":"relations.to_model","type":"string"},"to_id":{"path":"relations.to_id","type":"number"},"other_model":{"path":"relations.other_model","type":"string"},"other_id":{"path":"relations.other_id","type":"number"},"aorb":{"path":"relations.aorb","type":"string"},"other_aorb":{"path":"relations.other_aorb","type":"string"},"_id":{"path":"relations._id","type":"id"},"flags":{"path":"relations.flags","type":"object"},"id":{"path":"relations.id","type":"number"},"comment":{"path":"relations.comment","type":"string"},"origin":{"path":"relations.origin","array":true,"type":"object"},"ctime":{"path":"relations.ctime","type":"date"},"mtime":{"path":"relations.mtime","type":"date"}},"path":"relations","array":true,"primary_key":"relation_name"},"fathers":{"type":"object","fields":{"id":{"path":"fathers.id","type":"number"},"_id":{"path":"fathers._id","type":"id"},"origin":{"path":"fathers.origin","array":true,"type":"object"}},"path":"fathers","array":true},"children":{"type":"object","fields":{"id":{"path":"children.id","type":"number"},"_id":{"path":"children._id","type":"id"},"origin":{"path":"children.origin","array":true,"type":"object"}},"path":"children","array":true},"metadatas":{"type":"object","fields":{"metadata_id":{"path":"metadatas.metadata_id","type":"number"},"metadata_name":{"path":"metadatas.metadata_name","type":"string"},"value":{"path":"metadatas.value","type":"object"},"_id":{"path":"metadatas._id","type":"id"},"flags":{"path":"metadatas.flags","type":"object"},"id":{"path":"metadatas.id","type":"number"},"comment":{"path":"metadatas.comment","type":"string"},"origin":{"path":"metadatas.origin","array":true,"type":"object"},"ctime":{"path":"metadatas.ctime","type":"date"},"mtime":{"path":"metadatas.mtime","type":"date"}},"path":"metadatas","array":true,"primary_key":"metadata_name"},"flags":{"path":"flags","type":"object"},"user":{"path":"user","fields":{"username":{"path":"user.username","type":"string"}},"type":"object"},"id":{"path":"id","type":"number"},"comment":{"path":"comment","type":"string"},"origin":{"path":"origin","array":true,"type":"object"},"ctime":{"path":"ctime","type":"date"},"mtime":{"path":"mtime","type":"date"},"mmtime":{"path":"mmtime","type":"date"},"mctime":{"path":"mctime","type":"date"},"r":{"path":"r","fields":{"Article":{"path":"r.Article","array":true,"type":"string"},"Website":{"path":"r.Website","array":true,"type":"string"},"File":{"path":"r.File","array":true,"type":"string"}},"type":"object"},"_id":{"path":"_id","type":"id"}},"root":"Tag","searchKey":["name","relations.relation_name","metadatas.metadata_name","comment"]},
  Catalogue:{"type":"object","fields":{"name":{"path":"name","type":"string"},"type":{"path":"type","type":"string"},"description":{"path":"description","type":"string"},"fathers":{"type":"object","fields":{"id":{"path":"fathers.id","type":"number"},"_id":{"path":"fathers._id","type":"id"},"origin":{"path":"fathers.origin","array":true,"type":"object"}},"path":"fathers","array":true},"children":{"type":"object","fields":{"id":{"path":"children.id","type":"number"},"_id":{"path":"children._id","type":"id"},"origin":{"path":"children.origin","array":true,"type":"object"}},"path":"children","array":true},"metadatas":{"type":"object","fields":{"metadata_id":{"path":"metadatas.metadata_id","type":"number"},"metadata_name":{"path":"metadatas.metadata_name","type":"string"},"value":{"path":"metadatas.value","type":"object"},"_id":{"path":"metadatas._id","type":"id"},"flags":{"path":"metadatas.flags","type":"object"},"id":{"path":"metadatas.id","type":"number"},"comment":{"path":"metadatas.comment","type":"string"},"origin":{"path":"metadatas.origin","array":true,"type":"object"},"ctime":{"path":"metadatas.ctime","type":"date"},"mtime":{"path":"metadatas.mtime","type":"date"}},"path":"metadatas","array":true,"primary_key":"metadata_name"},"flags":{"path":"flags","type":"object"},"user":{"path":"user","fields":{"username":{"path":"user.username","type":"string"}},"type":"object"},"id":{"path":"id","type":"number"},"comment":{"path":"comment","type":"string"},"origin":{"path":"origin","array":true,"type":"object"},"ctime":{"path":"ctime","type":"date"},"mtime":{"path":"mtime","type":"date"},"mmtime":{"path":"mmtime","type":"date"},"mctime":{"path":"mctime","type":"date"},"r":{"path":"r","fields":{"Article":{"path":"r.Article","array":true,"type":"string"},"Website":{"path":"r.Website","array":true,"type":"string"},"File":{"path":"r.File","array":true,"type":"string"}},"type":"object"},"_id":{"path":"_id","type":"id"}},"root":"Catalogue","searchKey":["name","metadatas.metadata_name","comment"]},
}

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
      ( (unfinished0) (unfinished1 || unfinished11:)) ||
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
      last "several keys" are +search -keys
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
      {$and: ['unfinished0', {$or: ['unfinished1', {unfinished11: null}]}]},
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
      {$and: [
        {'partOP2.nice.good.great':{$op:{$op: {$: [
          123, {'inner.region':{$in: [
            456, {'inner.inner': {$in: 567}}
          ]}}
        ]}}}},
        'last', 'several keys', 'are', '+search', '-keys'
      ]}
    ]}
  },
  search0: {
    content:  `
      SingleKey
      "1"
      ""
      `,
    contentObj: {$and: ['SingleKey', "1", ""]},
  },
  search1: {
    content:  `
      multiple keys with "some operations" like +good -bad
      `,
    contentObj: {$and: [
      "multiple",
      "keys",
      "with",
      "some operations",
      "like",
      "+good",
      "-bad",
    ]},
  },
  Article: {
    content: `
    id:23333 ||
    id|in:[2333,23333,233333] ||
    id|nin:[2333,23333,233333] ||
    id|gt: 10 ||
    (id:{$gte:100, $lt:200} || (id|gte: 100 && id|lt: 200) || (id|gte:100 id|lt:200)) ||

    title:exactMatch ||
    title:"exact match" ||
    title: /.*exact match$/ ||
    title|in: [title1, title2, "title 3", /title.*4/] ||
    user.username: 'accretion' ||

    mtime|gt: "2019" mtime|lt: "2020-10-10T12:00:00+03:00" ||
    ctime:">-24h" ||
    ctime:">-30d <-7d" ||
    ctime:"(in:2019 (>10:00 <18:30) || (>03:00 <05:00))" ||
    mtime:"in:year:2000" ||
    mtime:"(in:2001 in:month:03)" ||
    mtime:"(in:2002 in:day:29)" ||
    mtime:"(in:2004 in:02-29)" ||
    mtime:"(in:2019 in:weekday:3)" ||
    mtime:"(in:2019-01 >=weekday:3 <weekday:5)" ||
    mtime:"in:2008-08-08" ||
    mtime:"in:2010-10" ||
    mtime:"in:201012" ||
    mtime:"(>06-06 <06-11)" ||

    tags|len|gt: 5 ||
    tags|len: {$lte: 5, $gt: 2} ||
    (tags: 'good' || tags.tag_name: 'good') ||
    (tags: /goo/  || tags.tag_name: /goo/) ||
    (tags|in: ['good', 'bad', /fin/] || tags.tag_name|in: ['good', 'bad', /fin/]) ||
    (tags: {tag_name: 'good', ctime|gt: '2019-03'} || (tags.tag_name: 'good' || tags.ctime|gt: '2019-03')) ||
    tags|elemMatch: {tag_name: 'good', ctime: {$gt: '2019-03', $lt:'2019-10-10T12:00'}} ||
    tags|elemMatch: {$or:[
      {$and:[
        tag_name: 'good', ctime: {$gt: '2019-03', $lt:'2019-10-10T12:00'}
      ]},
      {ctime:{$lte: '2018-12'}},
      {tag_name|in: [bad, /fine/]}
    ]} ||

    metadatas|el:{
      metadata_name: 'rating', value|gte: 3
    } ||

    python "parallel programming" -javascript
    `,
    contentObj: { $or:[
      {id:23333},
      {id:{$in:[2333,23333,233333]}},
      {id:{$nin:[2333,23333,233333]}},
      {id:{$gt:10}},
      {$or:[
        {id:{$gte:100, $lt:200}},
        {$and:[ {id:{$gte: 100}}, {id:{$lt: 200}}, ]},
        {$and:[ {id:{$gte: 100}}, {id:{$lt: 200}}, ]},
      ]},
      {title:'exactMatch'},
      {title:"exact match"},
      {title: /.*exact match$/},
      {title:{$in:['title1', 'title2', "title 3", /title.*4/]}},
      {'user.username': 'accretion'},
      {$and:[
        {mtime:{$gt: "2019"}},
        {mtime:{$lt: "2020-10-10T12:00:00+03:00"}},
      ]},
      {ctime:">-24h"},
      {ctime:">-30d <-7d"},
      {ctime:"(in:2019 (>10:00 <18:30) || (>03:00 <05:00))"},
      {mtime:"in:year:2000"},
      {mtime:"(in:2001 in:month:03)"},
      {mtime:"(in:2002 in:day:29)"},
      {mtime:"(in:2004 in:02-29)"},
      {mtime:"(in:2019 in:weekday:3)"},
      {mtime:"(in:2019-01 >=weekday:3 <weekday:5)"},
      {mtime:"in:2008-08-08"},
      {mtime:"in:2010-10"},
      {mtime:"in:201012"},
      {mtime:"(>06-06 <06-11)"},
      {tags:{$len:{$gt: 5}}},
      {tags:{$len:{$lte: 5, $gt:2}}},
      {$or:[
        {tags: 'good'},
        {'tags.tag_name': 'good'},
      ]},
      {$or:[
        {tags: /goo/},
        {'tags.tag_name': /goo/},
      ]},
      {$or:[
        {tags: {$in: ['good', 'bad', /fin/]}},
        {'tags.tag_name': {$in: ['good', 'bad', /fin/]}},
      ]},
      {$or:[
        {tags: {tag_name:'good', ctime:{$gt:'2019-03'}}},
        {$or:[
          {'tags.tag_name':'good'},
          {'tags.ctime':{$gt:'2019-03'}},
        ]}
      ]},
      {tags:{$elemMatch:{
        tag_name: 'good', ctime: {$gt: '2019-03', $lt:'2019-10-10T12:00'}
      }}},
      {tags:{$elemMatch:{$or:[
        {$and:[
          {tag_name: 'good'}, {ctime: {$gt: '2019-03', $lt:'2019-10-10T12:00'}}
        ]},
        {ctime:{$lte: '2018-12'}},
        {tag_name:{$in: ['bad', /fine/]}},
      ]}}},
      {metadatas:{$el:{
        metadata_name: 'rating', value:{$gte:3}
      }}},
      {$and: [
        'python',
        "parallel programming",
        '-javascript',
      ]}
    ]}
  },
  Tag: {
    content: `
    metadatas: 'reading'
    metadatas.value|gte: 10 ||

    metadatas: 'rating'
    metadatas.value|gte: 5
    metadatas.ctime: ">2019"
    metadatas.mtime: "in:weekday:5 >=2019-03 <=2019-06"

    $unwind: $metadatas
    python "parallel programming" -javascript
    `,
    contentObj: {$or: [
      {$and:[
        {metadatas: 'reading'},
        {'metadatas.value': {$gte: 10}},
      ]},
      {$and:[
        {metadatas: 'rating'},
        {'metadatas.value': {$gte: 5}},
        {'metadatas.ctime': '>2019'},
        {'metadatas.mtime': "in:weekday:5 >=2019-03 <=2019-06"},
        {$unwind: "$metadatas"},
        'python',
        'parallel programming',
        '-javascript',
      ]},
    ]},
  },
  Catalogue:{
    content:`
      (id|in: [123,456,789] ||
      comments: /good for it/ ||
      origin.time|gt: 10 ||
      fathers.origin.id|gt: 'manual' ||
      metadatas.ctime: ">2018" ||
      metadatas.flags.name: good ||
      metadatas|in: ['good','bad',/nice/] ||
      metadatas: {metadata_name|in:['good',/nice/], ctime|gt:'2019', flags.name: 'good', value|gt: 100} ||
      r.Article|in: ['123', '456', /789/] ||
      r.Book|len|gt: 10 ||
      $expr: {
        $or:[
          $and: [{$gt: ["$tags_length", 3]}, {$gte: [5, "$tags_length"]}],
          $and: [{$eq: [{$abs: "$metadata_length"}, 5]}],
        ]
      } ||
      $where: "can only be string" ) &&
      $text: {
        $search: "the 'search demo' -good"
      }
      $addFields: {
        tags_length: {$size: $tags},
        metadatas_length: {$size: $metadatas},
      }
      $unwind: "relations"
    `,
    contentObj: {$and:[
      {$or:[
        {id:{$in:[123,456,789]}},
        {comments: /good for it/},
        {'origin.time': {$gt: 10}},
        {'fathers.origin.id': {$gt: 'manual'}},
        {'metadatas.ctime':'>2018'},
        {'metadatas.flags.name':'good'},
        {metadatas:{$in:['good','bad',/nice/]}},
        {metadatas:{
          metadata_name:{$in:['good',/nice/]},
          ctime:{$gt: '2019'},
          'flags.name': 'good',
          value:{$gt: 100},
        }},
        {'r.Article':{$in:['123', '456', /789/]}},
        {'r.Book':{$len:{$gt:10}}},
        {$expr: {
          $or:[
            {$and: [{$gt: ["$tags_length", 3]}, {$gte: [5, "$tags_length"]}]},
            {$and: [{$eq: [{$abs: "$metadata_length"}, 5]}]},
          ]
        }},
        {$where: "can only be string"}
      ]},
      {$text: {$search: "the 'search demo' -good"}},
      {$addFields: {
        tags_length: {$size: "$tags"},
        metadatas_length: {$size: "$metadatas"},
      }},
      {$unwind: "relations"}
    ]}
  },
  incomplete: {
    content:`
    titl ||
    title ||
    title: ||
    title: haha ||
    title: 'hehe' ||
    title: {} ||
    title: {$g} ||
    title: {$gt} ||
    title: {$gt:} ||
    title: {$gt:'123'} ||
    title: {$gt:'123', $i} ||
    title: {$gt:'123', $in} ||
    title: {$gt:'123', $in:} ||
    title: {$gt:'123', $in:[]} ||
    title: {$gt:'123', $in:[1,2]} ||
    title|  ||
    title|l  ||
    title|lt  ||
    title|lt:  ||
    title|lt: foo  ||
    title|in  ||
    title|in:  ||
    title|in: [foo,]  ||
    title|in: [foo,"haha hehe"]  ||
    title: [] ||
    title: [123] ||
    ctim ||
    ctime ||
    ctime: ||
    ctime: "2018" ||
    ctime| ||
    ctime|l ||
    ctime|lt ||
    ctime|lt: ||
    ctime|lt: "2018" ||
    ctime: {} ||
    ctime: {$g} ||
    ctime: {$gt} ||
    ctime: {$gt:} ||
    ctime: {$gt:'2018'} ||
    ctime: {$gt:'2018', $l} ||
    ctime: {$gt:'2018', $lt} ||
    ctime: {$gt:'2018', $lt:} ||
    ctime: {$gt:'2018', $lt:'2018'} ||
    ctime: [] ||
    ctime: [foo,bar] ||
    flag ||
    flags ||
    flags| ||
    flags|exist ||
    flags|exists ||
    flags|exists: ||
    flags|exists: true ||
    flags: ||
    flags: {} ||
    flags: {debug} ||
    flags: {debug:} ||
    flags: {debug: true} ||
    flags. ||
    flags.debug ||
    flags.debug: ||
    flags.debug: true ||
    flags.count| ||
    flags.count|gt ||
    flags.count|gt: ||
    flags.count|gt: 10 ||
    flags.count|in: [] ||
    flags.count|in: [10, 20] ||
    tag ||
    tag: ||
    tag:{} ||
    tag:{unexists} ||
    tag:{unexists:} ||
    tag:{unexists:1} ||
    tag:{$exists} ||
    tag:{$exists:} ||
    tag:{$exists:1} ||
    tag| ||
    tag|exist ||
    tag|exists ||
    tag|exists: ||
    tag|exists: ture ||
    tags ||
    tags: ||
    tags: foo ||
    tags: /foo/ ||
    tags. ||
    tags.tag_name ||
    tags.tag_name: ||
    tags.tag_name: "" ||
    tags.tag_name: "foo" ||
    tags: {} ||
    tags: {$i} ||
    tags: {$in} ||
    tags: {$in:} ||
    tags: {$in:[]} ||
    tags: {$in:[good,/123/]} ||
    tags: {$in:[good,/123/], $} ||
    tags: {$in:[good,/123/], $el} ||
    tags: {$in:[good,/123/], $el:} ||
    tags: {$in:[good,/123/], $el:{}} ||
    tags: {$in:[good,/123/], $el:{tag_nam}} ||
    tags: {$in:[good,/123/], $el:{tag_name}} ||
    tags: {$in:[good,/123/], $el:{tag_name|}} ||
    tags: {$in:[good,/123/], $el:{tag_name|i}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctim]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018']}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:]}} ||
    tags: {$in:[good,/123/], $el:{tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:10]}} ||
    tags: [] ||
    tags: [foo, bar] ||
    tags|
    tags|le ||
    tags|len ||
    tags|len: ||
    tags|len: 5 ||
    tags|len|   ||
    tags|len|gt ||
    tags|len|gt: ||
    tags|len|gt: 5 ||
    tags|len: {} ||
    tags|len: {$gt} ||
    tags|len: {$gt:} ||
    tags|len: {$gt:5, } ||
    tags|len: {$gt:5, $lt} ||
    tags|len: {$gt:5, $lt:} ||
    tags|len: {$gt:5, $lt:10} ||
    tags|lt ||
    tags|lt: ||
    tags|lt:foo ||
    tags|in ||
    tags|in: ||
    tags|in: [] ||
    tags|in: [foo, bar] ||
    tags|el ||
    tags|el: ||
    tags|el: {} ||
    tags|el: {tag_i} ||
    tags|el: {tag_id} ||
    tags|el: {tag_id:} ||
    tags|el: {tag_id: 10} ||
    tags|el: {tag_id: 10, tag_name} ||
    tags|el: {tag_id: 10, tag_name|} ||
    tags|el: {tag_id: 10, tag_name|i} ||
    tags|el: {tag_id: 10, tag_name|in} ||
    tags|el: {tag_id: 10, tag_name|in:} ||
    tags|el: {tag_id: 10, tag_name|in:[]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctim]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|g]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018']} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_i]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|g]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:]} ||
    tags|el: {tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:10]} ||
    tags|el| ||
    tags|el|o ||
    tags|el|or ||
    tags|el|or: ||
    tags|el|or: [] ||
    tags|el|or: [tag_i] ||
    tags|el|or: [tag_id] ||
    tags|el|or: [tag_id:] ||
    tags|el|or: [tag_id: 10] ||
    tags|el|or: [tag_id: 10, tag_name] ||
    tags|el|or: [tag_id: 10, tag_name|] ||
    tags|el|or: [tag_id: 10, tag_name|i] ||
    tags|el|or: [tag_id: 10, tag_name|in] ||
    tags|el|or: [tag_id: 10, tag_name|in:] ||
    tags|el|or: [tag_id: 10, tag_name|in:[]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctim]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|g]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018']] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_i]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|g]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:]] ||
    tags|el|or: [tag_id: 10, tag_name|in:[foo, bar], $and:[ctime|gt:'2018', tag_id|gt:10]] ||
    metadatas ||
    metadatas: ||
    metadatas: [] ||
    metadatas: [foo, bar] ||
    metadatas| ||
    metadatas|i ||
    metadatas|in ||
    metadatas|in: ||
    metadatas|in: [] ||
    metadatas|in: [foo, bar] ||
    metadatas.
    metadatas.metadata_na  ||
    metadatas.metadata_name ||
    metadatas.metadata_name: ||
    metadatas.metadata_name: '123' ||
    metadatas.metadata_name| ||
    metadatas.metadata_name|i ||
    metadatas.metadata_name|in ||
    metadatas.metadata_name|in: ||
    metadatas.metadata_name|in: [] ||
    metadatas.metadata_name|in: [foo, bar] ||
    $and ||
    $and: ||
    $and:[] ||
    $and:[$or] ||
    $and:[$or:] ||
    $and:[$or:[]] ||
    $and:[$or:[tags]] ||
    $and:[$or:[tags:]] ||
    $and:[$or:[tags: foo]] ||
    $and:[$or:[tags: foo, tags: /foo/]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:foo]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:foo, tags|]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:foo, tags|in]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:foo, tags|in:]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:foo, tags|in:[]]] ||
    $and:[$or:[tags: foo, tags: /foo/], $or:[tags|lt:foo, tags|in:[foo, bar]]] ||
    $where ||
    $where: ||
    $where: "blablabla" ||
    $text ||
    $text: ||
    $text: {} ||
    $text: {$searc} ||
    $text: {$search} ||
    $text: {$search: } ||
    $text: {$search: good} ||
    $text| ||
    $text|sear ||
    $text|search ||
    $text|search: ||
    $text|search: "good" ||
    $expr ||
    $expr: ||
    $expr:{} ||
    $expr:{$an} ||
    $expr:{$and} ||
    $expr:{$and:} ||
    $expr:{$and:[]} ||
    $expr:{$and:[$g]} ||
    $expr:{$and:[$gt]} ||
    $expr:{$and:[$gt:]} ||
    $expr:{$and:[$gt:[]]} ||
    $expr:{$and:[$gt:[""]]} ||
    $expr:{$and:[$gt:["$ti"]]} ||
    $expr:{$and:[$gt:["$title"]]} ||
    $expr:{$and:[$gt:["$title", $abs]]} ||
    $expr:{$and:[$gt:["$title", $abs:]]} ||
    $expr:{$and:[$gt:["$title", $abs:""]]} ||
    $expr:{$and:[$gt:["$title", $abs:"$field"]]} ||
    $expr| ||
    $expr|an ||
    $expr|and ||
    $expr|and: ||
    $expr|and: [] ||
    $expr|and: [$or] ||
    $expr|and: [$or:] ||
    $expr|and: [$or:[]] ||
    $expr|and: [$or:[$lt]] ||
    $expr|and: [$or:[$lt:]] ||
    $expr|and: [$or:[$lt:[$hou]]] ||
    $expr|and: [$or:[$lt:[$hour]]] ||
    $expr|and: [$or:[$lt:[$hour:]]] ||
    $expr|and: [$or:[$lt:[$hour:""]]] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime"]]] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]]] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]],$eq] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]],$eq:] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]],$eq:[]] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]],$eq:[""]] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]],$eq:["$title"]] ||
    $expr|and: [$or:[$lt:[$hour:"$ctime",10]],$eq:["$title", /foo/]] ||
    $unwind ||
    $unwind: ||
    $unwind:{} ||
    $unwind:{blabla} ||
    $unwind:{blabla:} ||
    $unwind:{blabla:1} ||
    $addFields ||
    $addFields: ||
    $addFields:{} ||
    $addFields:{blabla} ||
    $addFields:{blabla:} ||
    $addFields:{blabla:1} ||
    last "search template" -gg
    `
  }
}

export default {
  name: 'test-app',
  components: {parseTestPre},
  data () {
    return {
      clsPrefix,
      dbstruct,
      lodash,
      cursor: 0,
      testData,
      demoStr,
      timer:{move: null},
    }
  },
  created() {
    this.dbstruct = dbstruct
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
