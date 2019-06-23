from glob import glob
js = glob('./*.js')
for each in js:
    with open(each) as f:
        text = f.read()
    if not 'module.exports = {\n' in text:
        continue

    if 'peg$DefaultTracer' in text:
        lines = text.split('\n')
        lines = lines[:-6]
        lines.append('let SyntaxError = peg$SyntaxError')
        lines.append('let DefaultTracer = peg$DefaultTracer')
        lines.append('let parse = peg$parse')
        lines.append('export default { SyntaxError, DefaultTracer, parse}')
    else:
        lines = text.split('\n')
        lines = lines[:-5]
        lines.append('let SyntaxError = peg$SyntaxError')
        lines.append('let parse = peg$parse')
        lines.append('export default { SyntaxError, parse}')

    with open(each, 'w') as f:
        text = '\n'.join(lines)
        f.write(text)
