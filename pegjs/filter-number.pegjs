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
  = ws num:Number ws {
    return num
  }

ValueBlock "value"
  = op:OP num:Number {
    if (op === '>=') {
      return function(input) {return input>=num}
    } else if (op === '<=') {
      return function(input) {return input<=num}
    } else if (op === '>') {
      return function(input) {return input>num}
    } else if (op === '<') {
      return function(input) {return input<num}
    } else if (op === '==') {
      return function(input) {return input==num}
    }
  }

OP "op"
  = '>='
  / '<='
  / '>'
  / '<'
  / '=='

DIGIT  = [0-9]

Number "number"
  = minus? int frac? exp? { return Number(text()) }

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
