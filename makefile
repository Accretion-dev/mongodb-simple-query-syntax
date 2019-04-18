all:
	cat makefile
gen:
	npx pegjs --trace mongodb-simple-query-syntax.pegjs
