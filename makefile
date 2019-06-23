all:
	cat makefile
gen:
	npx pegjs --trace pegjs/json-filter.pegjs
	npx pegjs --trace pegjs/mongodb-simple-query-syntax.pegjs
	npx pegjs --trace pegjs/filter-date.pegjs
	npx pegjs --trace pegjs/filter-number.pegjs
	npx pegjs --trace pegjs/filter-date-mongodb.pegjs
	cd pegjs; python toExportDefault.py
genwatch:
	npx nodemon --watch pegjs --exec 'make gen'
