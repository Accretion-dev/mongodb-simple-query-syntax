const testConfig = require('./test-config.json')
// import backend from 'vue-selenium-unittest/backend.js'
import backend from 'vue-selenium-unittest/src/backend.js'
let normalKeys = '~!@#$%^&*()_+|}{POIUYTREWQASDFGHJKL:"?><MNBVCXZ"}'+"`1234567890-=\\][poiuytrewqasdfghjkl;'/.,mnbvcxz'"
let tests = {
  async all ({name, driver, Test, Key, By, until, Button, Origin}) {
    let keys = Object.keys(tests).filter(_ => _ !== 'all')
    for (let key of keys) {
      await tests[key]({name, driver, Test, Key, By, until, Button, Origin})
    }
  },
  'syntax': async ({name, driver, Test, Key, By, until, Button, Origin}) => {
    let data, actions, input,c
    let rootSelector = "#syntax-id"
    let interval = 10
    let app = await driver.findElement({id: 'app'})
    t = Test.block({name, rootSelector})
    await t.init()
    await t.initScroll()
    let root = await driver.findElement(By.css(rootSelector))
    let plus = await driver.findElement(By.css('#plus'))
    input = await driver.findElement(By.css('#plus'))

    await t.changeComment('test syntax', 1000)
    await t.actions({actions: {move: plus}})
    await t.actions({actions: [...Array(1300).keys()].map(_ => ({click:plus})), interval})

    await t.changeComment('all done', 2000)
    await t.changeComment('')
  },
}
let t = new backend({options: testConfig, tests})
t.init()
