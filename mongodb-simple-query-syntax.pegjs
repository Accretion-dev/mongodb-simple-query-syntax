{
  function autoCompleteTracer () {
    this.level = 1
    this.tree = {rule: 'root', level: 0, children:[]}
    this.currentNode = this.tree
  }
  autoCompleteTracer.prototype.trace = function (input) {
  }
}

start
  = StartOR
  / StartAND
  / StartNOT
  / StartBlock

StartOR "startor"
  = ws10 v:OR    ws01 { return v }
StartAND "startand"
  = ws10 v:AND   ws01 { return v }
StartNOT "startnot"
  = ws10 v:NOT   ws01 { return v }
StartBlock "startblock"
  = ws10 v:Block ws01 { return v }

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
    tail:(ws01 ORSeperator ws10 v:ANDBlock { return v; })+
    { return {$or: [head].concat(tail)}; }

AND "and"
  = head:NOTBlock
    tail:(ANDSeperator ws10 v:NOTBlock { return v; })+
    { return {$and: [head].concat(tail)}; }

ANDBlock "andblock"
  = AND
  / NOTBlock

NOTBlock "notblock"
  = NOT
  / Block

NOT "not"
  = NOTSeperator ws v:Block { return {$not: v} }

Block "block"
  = NestedORBlock
  / NestedANDBlock
  / NestedNOTBlock
  / NestedPairBlock
  / NestedValueBlock
  / Pair
  / ValueBlock

NestedORBlock 'nestedorblock'
  = NestedStart ws10 v:OR ws01 NestedEnd  {return v}
NestedANDBlock 'nestedandblock'
  = NestedStart ws10 v:AND ws01 NestedEnd  {return v}
NestedNOTBlock 'nestednotblock'
  = NestedStart ws10 v:NOT ws01 NestedEnd  {return v}
NestedPairBlock 'nestedpairblock'
  = NestedStart ws10 v:Pair ws01 NestedEnd  {return v}
NestedValueBlock 'nestedvalueblock'
  = NestedStart ws10 v:ValueBlock ws01 NestedEnd  {return v}

NestedStart = "("
NestedEnd = ")"

ANDSeperator
  = ws01 '&&' { return text() }
  / ws00 { return text() }

ORSeperator
  = '||' { return text() }

NOTSeperator
  = '~' { return text() }

ws10Object 'ws10object'
  = ws

ws01Object 'ws01object'
  = ws

Object "object"
  = ObjectStart ws10Object
    pairs:(
      head:ObjectElement ws01Object
      middle:(ObjectSeperator ws10Object m:ObjectElement ws01Object { return m; })*
      tail:(
        ObjectSeperator ws01Object
      )?
      {
        var result = {};

        [head].concat(middle).forEach(function(element) {
          Object.assign(result, element)
        });

        return result;
      }
    )?
    ObjectEnd
    { return pairs !== null ? pairs: {} }

ObjectElement "objectelement"
  = Pair
  / v:ValueObject { return {[v]: null}}

ValueObject 'valueobject'
  = Value

ObjectStart = "{"
ObjectEnd = "}"
ObjectSeperator = ','

ws10Array 'ws10array'
  = ws

ws01Array 'ws01array'
  = ws

Array "array"
  = ArrayStart ws10Array
    values:(
      head:ValueArray ws01Array
      middle:(ArraySeperator ws10Array v:ValueArray ws01Array { return v; })*
      tail:(
        ArraySeperator ws01Array
      )?
      { return [head].concat(middle); }
    )?
    ArrayEnd
    { return values !== null ? values : []; }

ArrayStart = "["
ArrayEnd = "]"
ArraySeperator = ','

Pair "pair"
  = v:PairComplete {
    let {keys, value} = v
    if (keys.length===1) {
      return {[keys[0]]: value}
    } else {
      keys = keys.map(_ => _)
      let key = keys.splice(0,1)[0]
      let pop = keys.pop()
      value = {[`\$${pop}`]: value}
      let length = keys.length
      for (let i=0; i<length; i++) {
        pop = keys.pop()
        value = {[`\$${pop}`]: value}
      }
      return {[key]: value}
    }
  }
  / v:PairIncomplete {
    let {keys} = v
    if (keys.length===1) {
      return {[keys[0]]: null}
    } else {
      keys = keys.map(_ => _)
      let key = keys.splice(0,1)[0]
      let pop = keys.pop()
      let value = {[`\$${pop}`]: null}
      let length = keys.length
      for (let i=0; i<length; i++) {
        pop = keys.pop()
        value = {[`\$${pop}`]: value}
      }
      return {[key]: value}
    }
  }

PairComplete
  = keys:Key ws PairSeperator ws value:ValuePair {
    return {keys, value}
  }
PairIncomplete
  = keys:Key ws ws01PS {
    return {keys}
  }

ws01PS "pws01"
  = PairSeperator

OPSeperator
  = '|'

PairSeperator
  = ':'

OP "op"
  = chars:[0-9a-zA-Z_$]+ { return chars.join("") }

Key "key"
  = head:KeyValue
    middle:(
      ws OPSeperator ws op:OP
      { return op }
    )*
    tail:(
      ws OPSeperator
    )?
    {
      if (tail === null) {
        return [head].concat(middle)
      } else {
        return [head].concat(middle).concat([""])
      }
    }

KeyValue "keyvalue"
  = String
  / SimpleString
  / Number

SimpleString "simpleString"
  = prefix:[a-zA-Z_$] suffix:[0-9a-zA-Z_$.]* { return prefix + suffix.join(""); }

// ----- Numbers ----- from https://github.com/pegjs/pegjs/blob/master/examples/json.pegjs

ValuePair "value:pair"
  = Value
ValueBlock "value:block"
  = Value
ValueArray "value:array"
  = Value

Value "value"
  = ComplexValue
  / SimpleValue

ComplexValue 'complexValue'
  = Object
  / Array

SimpleValue 'simplevalue'
  = String
  / true
  / false
  / null
  / SimpleString
  / Number


false = "false" { return false }
null  = "null"  { return null  }
true  = "true"  { return true  }

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
  = decimal_point DIGIT+

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
