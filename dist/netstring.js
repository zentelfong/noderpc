"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WriteStream = exports.ReadStream = void 0;
var stream_1 = require("stream");
function nsPayloadLength(buf, encoding) {
    var len, i;
    for (len = 0, i = 0; i < buf.length; i++) {
        var cc = buf[i];
        if (cc === 0x3a) {
            if (i === 0) {
                throw new Error('Invalid netstring with leading \':\'');
            }
            return len;
        }
        if (cc < 0x30 || cc > 0x39) {
            throw new Error('Unexpected character \'' + String.fromCharCode(buf[i]) + '\' found at offset ' + i);
        }
        if (len === 0 && i > 0) {
            throw new Error('Invalid netstring with leading 0');
        }
        len = len * 10 + cc - 0x30;
    }
    // We didn't get a complete length specification
    if (i === buf.length) {
        return -1;
    }
    return len;
}
function nsWriteLength(len) {
    // Negative values are special (see nsPayloadLength()); just return it
    if (len < 0) {
        return len;
    }
    // Compute the number of digits in the length specifier. Stop at
    // any value < 10 and just add 1 later (this catches the case where
    // '0' requires a digit.
    var nslen = len;
    while (len >= 10) {
        nslen += 1;
        len /= 10;
    }
    // nslen + 1 (last digit) + 1 (:) + 1 (,)
    return nslen + 3;
}
function nsPayload(buf, encoding) {
    if (typeof buf === 'string') {
        buf = Buffer.from(buf, encoding);
    }
    var len = nsPayloadLength(buf);
    if (len < 0) {
        return [len, null];
    }
    var nsLen = nsWriteLength(len);
    // We don't have the entire buffer yet
    if (buf.length - nsLen < 0) {
        return [-1, null];
    }
    var start = nsLen - len - 1;
    return [0, buf.slice(start, start + len)];
}
function nsWrite(pay) {
    var len = pay.length;
    var nsLen = nsWriteLength(len);
    var hdrLen = nsLen - len - 1;
    var buf = Buffer.alloc(nsLen);
    buf.write(len + ':', 0);
    pay.copy(buf, hdrLen);
    buf.write(',', nsLen - 1);
    return buf;
}
;
var ReadStream = /** @class */ (function (_super) {
    __extends(ReadStream, _super);
    function ReadStream() {
        return _super.call(this) || this;
    }
    ReadStream.prototype._read = function (size) {
    };
    ReadStream.prototype._write = function (data, encoding, callback) {
        if (!(data instanceof Buffer)) {
            data = Buffer.from(data || '', encoding);
        }
        if (this._buffer) {
            this._buffer = Buffer.concat([this._buffer, data]);
        }
        else {
            this._buffer = data;
        }
        while (this._buffer && this._buffer.length > 0) {
            try {
                var _a = nsPayload(this._buffer, encoding), rslt = _a[0], pay = _a[1];
                if (rslt < 0) {
                    break;
                }
                var nsLen = nsWriteLength(pay.length);
                this._buffer = this._buffer.slice(nsLen, this._buffer.length);
                this.emit('data', pay);
            }
            catch (exception) {
                this.emit('error', exception);
                break;
            }
        }
        callback();
    };
    return ReadStream;
}(stream_1.Duplex));
exports.ReadStream = ReadStream;
var WriteStream = /** @class */ (function (_super) {
    __extends(WriteStream, _super);
    function WriteStream() {
        return _super.call(this) || this;
    }
    WriteStream.prototype._read = function (size) {
    };
    WriteStream.prototype._write = function (data, encoding, callback) {
        if (data instanceof Buffer) {
            encoding = undefined;
        }
        else {
            data = Buffer.from(data || '', encoding);
        }
        this.push(nsWrite(data));
        callback();
    };
    return WriteStream;
}(stream_1.Duplex));
exports.WriteStream = WriteStream;
//# sourceMappingURL=netstring.js.map