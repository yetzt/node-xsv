# xsv

xsv is a lightweight, dependency-free and pretty fast stream parser for data with character separated values like csv, tsv and similar. 
It's deliberately written in plain old JavaScript and can be used with any node version capable of `Stream.Transform`.
It can deal with some of the stupid people do to csv/tsv files, like empty lines, linebreaks in quoted fields and even comments.

## Usage Example

```javascript
var fs = require("fs");
var xsv = require("xsv");

var opts = {
	sep: ",",                  // as string
	quote: 0x22,               // or charcode integer
	escape: Buffer.from("\\"), // or as Buffer
	header: true,
};

fs.createReadStream("file.csv").pipe(xsv(opts).on("data", function(data){
	console.log(data);
}).on("end", function(){
	console.log("done.");
}));
```

## Options

* `sep` - Separation character: `string`, `Buffer` or `int` of byte code. First character/byte only. Default: `,`
* `quote` - Quote character: `string`, `Buffer` or `int` of byte code; `null` for to disable. First character/byte only. Default: `"` for csv or `null` for tsv
* `escape` - Escape character: `string`, `Buffer` or `int` of byte code; `null` for to disable. First character/byte only. Default: `\` for csv or `null` for tsv
* `header` - First line is the header: `bool||object`; `true` emits data as `object`, `false` as array. Give an object to set a custom header. Default: `true`
* `skip` - Number of lines to skip: `int`; Ignores this number of lines before starting to parse. Handy to override the header given you know the field order. Default: `0`
* `comment` - Comment character: `string`, `Buffer` or `int` of byte code; `null` for to disable. First character/byte only; Ignores all lines starting with this character. Default: `\` for csv or `null` for tsv
* `unescape` - Transfer escape sequences (`\t`, `\r`, `\n`) in quoted fields to actual control characters: `bool`. Default: `false`
* `stripbom` — Strip BOM from stream (if present, this *will* mess up your data otherise): `bool`. Default: `true`
* `trim` — remove whitespace before and after values: `bool`. Default: `false`

## License

[UNLICENSE](UNLICENSE)

## Acknowledgements

I was inspired to write this code because [@substack](https://npmjs.com/~substack) blocked me after i [asked nicely](https://github.com/substack/node-optimist/issues/152#issuecomment-604662463) if they could fix the insecure [minimist](https://www.npmjs.com/package/minimist)-dependency in [optimist](https://www.npmjs.com/package/optimist), which the also abandonned [sv](https://www.npmjs.com/package/sv) relies on. The nodejs ecosystem is presented to you by people being ignorant and hostile about maintaining their widely depended-upon code and abandonning their responsibility instead of transferring their orphaned code into careful long term maintainance.
