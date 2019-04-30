let {DateTime, Duration, Interval} = require('luxon')
let rawnow = new Date()
let now = DateTime.local()
let start = now.startOf('day')
let end = now.endOf('day')
console.log(`now: ${now.toISO()}, start: ${start.toISO()}, end: ${end.toISO()}`)
let {hour, minute, second} = now

debugger
