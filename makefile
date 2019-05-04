all:
	cat makefile
gen:
	npx pegjs --trace mongodb-simple-query-syntax.pegjs
	npx pegjs --trace filter-date.pegjs
	npx pegjs --trace filter-number.pegjs
	npx pegjs --trace filter-date-mongodb.pegjs
genwatch:
	npx nodemon --watch filter-date.pegjs --watch filter-date-mongodb.pegjs --watch filter-number.pegjs --watch mongodb-simple-query-syntax.pegjs --exec 'npx pegjs --trace mongodb-simple-query-syntax.pegjs;npx pegjs --trace filter-date.pegjs;npx pegjs --trace filter-date-mongodb.pegjs;npx pegjs --trace filter-number.pegjs'
