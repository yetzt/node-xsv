#!/usr/bin/env node

var stream = require("stream");

var xsv = module.exports = function(opts){
	if (!(this instanceof xsv)) return new xsv(opts);
	var self = this;
	
	// options
	if (!opts || opts instanceof Array) var opts = { sep: null };
	if (Buffer.isBuffer(opts)) opts = { sep: opts[0] };
	if (typeof opts === "string") opts = { sep: opts.charCodeAt(0) };
	if (typeof opts === "number") opts = { sep: (Number.isInteger(opts) ? opts : null) };

	if (!opts.sep) {
		opts.sep = 0x2c; // default to comma
	} else {
		if (Buffer.isBuffer(opts.sep)) opts.sep = opts.sep[0]; // first byte of nuffer
		if (typeof opts.sep === "string") opts.sep = opts.sep.charCodeAt(0); // charcode of first character
		if (typeof opts.sep === "number") opts.sep = (Number.isInteger(opts.sep) ? opts.sep : null); // integer is charcode
		if (!opts.sep) opts.sep = 0x2c; // default to comma
	}
	
	if (!opts.hasOwnProperty("quote")) {
		opts.quote = 0x22; // default to double quotes
	} else {
		if (Buffer.isBuffer(opts.quote)) opts.quote = opts.quote[0]; // first byte of nuffer
		if (typeof opts.quote === "string") opts.quote = opts.quote.charCodeAt(0); // charcode of first character
		if (typeof opts.quote === "number") opts.quote = (Number.isInteger(opts.quote) ? opts.quote : null); // integer is charcode
		if (!opts.quote) opts.quote = (opts.sep === 0x9) ? null : 0x22; // none for tsv, default to double quotes
	}

	if (!opts.hasOwnProperty("escape")) {
		opts.escape = 0x5c; // default to backslash
	} else {
		if (Buffer.isBuffer(opts.escape)) opts.escape = opts.escape[0]; // first byte of nuffer
		if (typeof opts.escape === "string") opts.escape = opts.escape.charCodeAt(0); // charcode of first character
		if (typeof opts.escape === "number") opts.escape = (Number.isInteger(opts.escape) ? opts.escape : null); // integer is charcode
		if (!opts.escape) opts.escape = (opts.sep === 0x9) ? null : 0x5c; // none for tsv, default to backslash
	}

	if (!opts.hasOwnProperty("comment")) {
		opts.comment = null; // default to backslash
	} else {
		if (Buffer.isBuffer(opts.comment)) opts.comment = opts.comment[0]; // first byte of nuffer
		if (typeof opts.comment === "string") opts.comment = opts.comment.charCodeAt(0); // charcode of first character
		if (typeof opts.comment === "number") opts.comment = (Number.isInteger(opts.comment) ? opts.comment : null); // integer is charcode
		if (!opts.escape) opts.escape = null;
	}

	opts.header = (opts.header === false) ? opts.header : (!!opts.header) ? opts.header : true;
	opts.skip = (!!opts.skip && !isNaN(opts.skip)) ? parseInt(opts.skip,10)||0 : 0;

	opts.unescape = (!opts.hasOwnProperty("unescape")) ? false : !!opts.unescape;
	opts.stripbom = (!opts.hasOwnProperty("stripbom")) ? true : !!opts.stripbom;

	// states
	var state_linestart = true;
	var state_escaped = false;
	var state_quote = false;
	var state_skip = false;
	var state_eol = false;
	var state_eor = false;
	var state_first = true;
	
	// collection
	var collect_field = [];
	var collect_line = [];
	
	// action on parsed line
	var commit = function(data){
		if (data.length === 1 && data[0] === "") return; // ignore empty lines
		if (opts.header === false) {
			t.emit("data", data);
		} else if (opts.header === true) {
			opts.header = data;
		} else {
			t.emit("data", opts.header.reduce(function(d,h,i){
				return d[h]=(data.hasOwnProperty(i)?(data[i]||''):null),d;
			},{}));
		}
	};
	
	// buffer memory
	var mem = Buffer.allocUnsafe(0);
	
	var t = new stream.Transform({
		transform: function(chunk, encoding, fn) {

			var pos = mem.length; // initial position for chunk
			mem = Buffer.concat([mem, chunk]);
		
			// strip bom (if an utf8 byte order mark is present, the first header or field would contain it. 
			if (state_first) {
				if (opts.stripbom && mem[0] === 0xef && mem[1] === 0xbb && mem[2] === 0xbf) mem = mem.slice(3);
				state_first = false;
			}
			
			// check if buffer is empty
			if (mem.length === 0) return fn();
			
			// interate over bytes
			for (var i = pos; i < mem.length; i++) {

				if (state_linestart) {
					state_linestart = false;
					
					if (opts.skip > 0) {
						state_skip = true;
						opts.skip--;
						continue;
					}
					
					if (mem[i] === opts.comment) {
						state_skip = true;
						continue;
					}
					
				}
				
				if (state_skip) {

					if (mem[i] === 0xd && mem[i+1] === 0xa) continue; // ignore \r if followerd by \n

					// on line end reset
					if ((mem[i] === 0xa || mem[i] === 0xd)) {
						mem = mem.slice(i+1);
						i = -1;
						state_skip = false;
						state_linestart = true;
					}
					
					continue;
				}
				
				// check for quoted state
				if (mem[i] === opts.quote && !state_escaped) {
					state_quote = !state_quote; // toggle quote state
					continue;
				}
				
				if (state_quote) {
					
					// check if current character is escape character
					if (mem[i] === opts.escape) {
						state_escaped = !state_escaped;
						if (!state_escaped) collect_field.push(opts.escape);
						continue;
					}

					// check if current character is an escaped \t \n \v \f \r
					if (opts.unescape && state_escaped) {
						switch (mem[i]) {
							case 0x74: // t
								state_escaped = false
								collect_field.push(0x9);
								continue;
							break;
							case 0x6e: // n
								state_escaped = false
								collect_field.push(0xa);
								continue;
							break;
							case 0x76: // v
								state_escaped = false
								collect_field.push(0xb);
								continue;
							break;
							case 0x66: // f
								state_escaped = false
								collect_field.push(0xc);
								continue;
							break;
							case 0x72: // r
								state_escaped = false
								collect_field.push(0xd);
								continue;
							break;
						}
					}
					
					if (state_escaped) state_escaped = false;
					
				}
				
				if (!state_quote) {

					// check for \r\n
					if (mem[i] === 0xd && mem[i+1] === 0xa) {
						continue;
					}

					// check for line end: current char is \r\n and previous char is not \\
					if ((mem[i] === 0xa || mem[i] === 0xd)) {
						state_eol = true;
					}
					
					// check for field sep: current char is field sep and previous char is not \\ or line has ended
					if ((mem[i] === opts.sep && (i === 0 || mem[i-1] !== opts.escape)) || state_eol) {
						// console.log("collected field: "+Buffer.from(collect_field).toString());
						collect_line.push(Buffer.from(collect_field).toString());
						collect_field = [];
						state_eor = true;
					}
					
					// produce line, reset stuff
					if (state_eol) {
						commit(collect_line);
						collect_line = [];
						// trim mem, reset i
						mem = mem.slice(i+1);
						i = -1;
						state_linestart = true;
						state_eol = false;
						state_eor = false;
						continue;
					}
					
					// echck if field is collected, skip character
					if (state_eor) {
						state_eor = false;
						continue;
					}
					
				}

				collect_field.push(mem[i]);

			}
			
			fn();
		},
		flush: function(fn) {
			if (mem.length > 0) { // caused by no final new line
				collect_line.push(Buffer.from(collect_field).toString());
				commit(collect_line);
			}
			fn();
		}
	});

	return t;
};
