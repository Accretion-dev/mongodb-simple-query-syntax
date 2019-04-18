//const SeleniumTest = require('vue-selenium-unittest').default
const testConfig = require('./test-config.json')
module.exports = {
  devServer: {
    port: testConfig.appPort
  },
  configureWebpack: {
    plugins: [
      //new SeleniumTest(testConfig),
    ]
  }
}
