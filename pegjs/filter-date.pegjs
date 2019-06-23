{
  const {DateTime} = require('luxon')
}
start
  = filter:StartOR       value:LastValueBlock? { if (value===null) {return {filter}} else {return {filter, value}} }
  / filter:StartAND      value:LastValueBlock? { if (value===null) {return {filter}} else {return {filter, value}} }
  / filter:StartNOT      value:LastValueBlock? { if (value===null) {return {filter}} else {return {filter, value}} }
  / filter:StartBlock    value:LastValueBlock? { if (value===null) {return {filter}} else {return {filter, value}} }
  / filter:StartFunction value:LastValueBlock? { if (value===null) {return {filter}} else {return {filter, value}} }
  / value:LastValueBlock {return {value}}

StartOR "startor"
  = ws10 filter:OR    ws01 { return filter }
StartAND "startand"
  = ws10 filter:AND   ws01 { return filter }
StartNOT "startnot"
  = ws10 filter:NOT   ws01 { return filter }
StartBlock "startblock"
  = ws10 filter:Block ws01 { return filter }
StartFunction "startfunction"
  = ws10 rawsource:String ws01 {
    let lines = rawsource.split(';')
    lines[lines.length-1] = 'return ' + lines[lines.length-1]
    let pre=`
      if (v instanceof Date) {
        v = DateTime.fromJSDate(input)
      } else if (typeof(v) === 'string') {
        v = DateTime.fromISO(input)
      }
    `
    lines = [pre].concat(lines)
    let source = lines.join(';')
    let filter = new Function('v', source)
    return filter
  }

ws "whitespace"
  = chars:[ \t\n\r]* { return chars.join("") }

// means when start <  cursorPos <  end, do auto complete
ws00 'ws00'
  = ws
// means when start <= cursorPos <  end, do auto complete
ws10 'ws10'
  = ws
// means when start <  cursorPos <= end, do auto complete
ws01 'ws01'
  = ws

OR "or"
  = head:ANDBlock
    tail:(ws01 ORSeperator ws10 filter:ANDBlock { return filter })+
    {
      return function (input) {
        let all = [head].concat(tail)
        for (let each of all) {
          if (each(input)) return true
        }
        return false
      }
    }

AND "and"
  = head:NOTBlock
    tail:(ANDSeperator ws10 filter:NOTBlock { return filter })+
    {
      return function (input) {
        let all = [head].concat(tail)
        for (let each of all) {
          if (!each(input)) return false
        }
        return true
      }
    }

ANDBlock "andblock"
  = AND
  / NOTBlock

NOTBlock "notblock"
  = NOT
  / Block

NOT "not"
  = NOTSeperator ws filter:Block {
    return function (input) { return !filter(input)}
  }

Block "block"
  = NestedORBlock
  / NestedANDBlock
  / NestedNOTBlock
  / NestedValueBlock
  / ValueBlock

Year = [0-9] [0-9] [0-9] [0-9] {return text()}
Month = [0-1] [0-9] {return text()}
Day = [0-3] [0-9] {return text()}
Hour = [0-2] [0-9] {return text()}
Minute = [0-5] [0-9] {return text()}
Second = [0-5] [0-9] {return text()}
HalfHour = [0-1] [0-9] { return text() }
Weekday = [1-7]

DateTimeIncompleteString "DateTimeIncompleteString"
  = v:[0-9TZ+\-:.]* { return v.join(""); }

DateTimeString 'datetimestring'
  = DateString 'T' TimeString {return text()}

DateString "datestring"
  = Year '-' Month '-' Day { return text() }
  / Year Month Day { return text() }

SingleDateString 'singledatestring'
  = year:Year '-' month:Month '-' day:Day { return {year, month, day, type: 'ymd'} }
  / year:Year month:Month day:Day { return {year, month, day, type: 'ymd'} }
  / year:Year '-' month:Month { return {year, month, type: 'ym'} }
  / year:Year month:Month { return {year, month, type: 'ym'} }
  / year:Year { return {year, type: 'y'} }
  / month:Month '-' day:Day { return {month, day, type: 'md'} }
  / 'year:' year:Year { return {year, type: 'y'} }
  / 'month:' month:Month { return {month, type: 'm'} }
  / 'day:' day:Day { return {day, type: 'd'} }
  / 'weekday:' weekday:Weekday { return {weekday, type: 'w'} }

TimeString "timestring"
  = Hour ':' Minute ':' Second
    milisecond:('.' int {return text()})?
    timezone:TimeZoneString?
    { return text() }
  / Hour ':' Minute { return text() }
  / Hour { return text() }

TimeZoneString 'timezone'
  = 'Z'
  / [+\-] HalfHour (':' Minute)? {return text()}

DeltaTime 'deltatime'
  = op:DeltaOP v:INT unit:DeltaUnit {
    const deltaUnit = {
      'y': 'year',
      'M': 'month',
      'd': 'day',
      'h': 'hour',
      'm': 'minute',
      's': 'second',
    }
    let deltaDict = {[deltaUnit[unit]]: v}
    let now = DateTime.local()
    let then
    if (op === '+') {
      then = now.plus(deltaDict)
    } else {
      then = now.minus(deltaDict)
    }
    console.log(then.toISO())
    return {type: 'datetime', value: then}
  }

DeltaOP = [\-+]
DeltaUnit = [ymdhsM]

DateTimeBlock "datetime"
  = DeltaTime
  / v:DateTimeString { return { type: 'datetime', value:v }}
  / v:SingleDateString { return { type: 'date', value:v }}
  / v:TimeString { return { type: 'time', value:v }}

NestedORBlock 'nestedorblock'
  = NestedStart ws10 filter:OR ws01 NestedEnd  {return filter}
NestedANDBlock 'nestedandblock'
  = NestedStart ws10 filter:AND ws01 NestedEnd  {return filter}
NestedNOTBlock 'nestednotblock'
  = NestedStart ws10 filter:NOT ws01 NestedEnd  {return filter}
NestedValueBlock 'nestedvalueblock'
  = NestedStart ws10 filter:ValueBlock ws01 NestedEnd  {return filter}

NestedStart = "("
NestedEnd = ")"

ANDSeperator
  = ws01 '&&' { return text() }
  / ws00 { return text() }
ORSeperator
  = '||'
NOTSeperator
  = '~'

LastValueBlock "lastvalue"
  = ws string:DateTimeIncompleteString ws {
    return string
  }

ValueBlock "value"
  = op:OP datetime:DateTimeBlock {
    if (datetime.type === 'datetime') {
      return function(input) {
        let time = DateTime.fromISO(datetime.value)
        let inputDate
        if (input instanceof Date) {
          inputDate = DateTime.fromJSDate(input)
        } else if (typeof(input) === 'string') {
          inputDate = DateTime.fromISO(input)
        } else if (input instanceof DateTime) {
          inputDate = input
        }
        let left = inputDate
        let right = time
        if (op === '>=') {
          return left >= right
        } else if (op === '<=') {
          return left <= right
        } else if (op === '>') {
          return left > right
        } else if (op === '<') {
          return left < right
        } else if (op === 'in:') {
          throw Error('can not in a datetime, use <> opretions')
        }
      }
    } else if (datetime.type === 'date') {
      return function(input) {
        let inputDate
        if (input instanceof Date) {
          inputDate = DateTime.fromJSDate(input)
        } else if (typeof(input) === 'string') {
          inputDate = DateTime.fromISO(input)
        } else if (input instanceof DateTime) {
          inputDate = input
        }
        let {year, month, day, weekday, type} = datetime.value
        let time = DateTime.fromObject({year, month, day, weekday})
        let end
        if (type === 'ymd') {
          end = time.endOf('day')
        } else if (type === 'ym') {
          end = time.endOf('month')
        } else if (type === 'y') {
          end = time.endOf('year')
        }
        if (end) { // ymd, ym, y
          if (op === '>=') {
            return inputDate >= time
          } else if (op === '<=') {
            return inputDate <= time
          } else if (op === '>') {
            return inputDate > time
          } else if (op === '<') {
            return inputDate < time
          } else if (op === 'in:') {
            return inputDate >= time && inputDate <= end
          }
        } else {
          if (type === 'md') {
            month = Number(month)
            day = Number(day)
            if (op === '>=') {
              return inputDate.month >= month && inputDate.day >= day
            } else if (op === '<=') {
              return inputDate.month <= month && inputDate.day <= day
            } else if (op === '>') {
              return inputDate.month >= month && inputDate.day > day
            } else if (op === '<') {
              return inputDate.month <= month && inputDate.day < day
            } else if (op === 'in:') {
              return inputDate.month === month && inputDate.day === day
            }
          } else if (type === 'd') {
            day = Number(day)
            if (op === '>=') {
              return inputDate.day >= day
            } else if (op === '<=') {
              return inputDate.day <= day
            } else if (op === '>') {
              return inputDate.day > day
            } else if (op === '<') {
              return inputDate.day < day
            } else if (op === 'in:') {
              return inputDate.day === day
            }
          } else if (type === 'm') {
            month = Number(month)
            if (op === '>=') {
              return inputDate.month >= month
            } else if (op === '<=') {
              return inputDate.month <= month
            } else if (op === '>') {
              return inputDate.month > month
            } else if (op === '<') {
              return inputDate.month < month
            } else if (op === 'in:') {
              return inputDate.month === month
            }
          } else if (type === 'w') {
            weekday = Number(weekday)
            if (op === '>=') {
              return inputDate.weekday >= weekday
            } else if (op === '<=') {
              return inputDate.weekday <= weekday
            } else if (op === '>') {
              return inputDate.weekday > weekday
            } else if (op === '<') {
              return inputDate.weekday < weekday
            } else if (op === 'in:') {
              return inputDate.weekday === weekday
            }
          }
        }
      }
    } else if (datetime.type === 'time') {
      return function(input) {
        let time = DateTime.fromISO(datetime.value)
        let inputDate
        if (input instanceof Date) {
          inputDate = DateTime.fromJSDate(input)
        } else if (typeof(input) === 'string') {
          inputDate = DateTime.fromISO(input)
        } else if (input instanceof DateTime) {
          inputDate = input
        }
        let left = inputDate.toUTC().toISOTime()
        let right = time.toUTC().toISOTime()
        if (op === '>=') {
          return left >= right
        } else if (op === '<=') {
          return left <= right
        } else if (op === '>') {
          return left > right
        } else if (op === '<') {
          return left < right
        } else if (op === 'in:') {
          throw Error('can not in a time, use <> opretions')
        }
      }
    }
  }

OP "op"
  = '>='
  / '<='
  / '>'
  / '<'
  / 'in:'

Number "number"
  = minus? int frac? exp? { return Number(text()) }
DIGIT  = [0-9]
decimal_point
  = "."
digit1_9
  = [1-9]
e
  = [eE]
exp
  = e (minus / plus)? DIGIT+
frac
  = decimal_point DIGIT*
INT
  = zero {return 0}
  / (digit1_9 DIGIT*) {return Number(text())}
int
  = zero / (digit1_9 DIGIT*)
minus
  = "-"
plus
  = "+"
zero
  = "0"

// ----- Strings ----- from https://github.com/pegjs/pegjs/blob/master/examples/javascript.pegjs
String "string"
  = '"' chars:DoubleStringCharacter* '"' {
      return chars.join("")
    }
  / "'" chars:SingleStringCharacter* "'" {
      return chars.join("")
    }
DoubleStringCharacter
  = !('"' / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation
SingleStringCharacter
  = !("'" / "\\" / LineTerminator) SourceCharacter { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }
  / LineContinuation
LineContinuation
  = "\\" LineTerminatorSequence { return ""; }
EscapeSequence
  = CharacterEscapeSequence
  / "0" !DecimalDigit { return "\0"; }
  / HexEscapeSequence
  / UnicodeEscapeSequence
CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter
SingleEscapeCharacter
  = "'"
  / '"'
  / "\\"
  / "b"  { return "\b"; }
  / "f"  { return "\f"; }
  / "n"  { return "\n"; }
  / "r"  { return "\r"; }
  / "t"  { return "\t"; }
  / "v"  { return "\v"; }
NonEscapeCharacter
  = !(EscapeCharacter / LineTerminator) SourceCharacter { return text(); }
EscapeCharacter
  = SingleEscapeCharacter
  / DecimalDigit
  / "x"
  / "u"
HexEscapeSequence
  = "x" digits:$(HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }
UnicodeEscapeSequence
  = "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
      return String.fromCharCode(parseInt(digits, 16));
    }
LineTerminator
  = [\n\r\u2028\u2029]
SourceCharacter
  = .
LineTerminatorSequence "end of line"
  = "\n"
  / "\r\n"
  / "\r"
  / "\u2028"
  / "\u2029"
DecimalDigit
  = [0-9]
HexDigit
  = [0-9a-f]i
