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
exports.RpcClient = void 0;
var net_1 = require("net");
var RpcProvider_1 = require("./RpcProvider");
var netstring_1 = require("./netstring");
var events_1 = require("events");
var RpcClient = /** @class */ (function (_super) {
    __extends(RpcClient, _super);
    function RpcClient(option) {
        var _this = _super.call(this) || this;
        _this._option = option;
        _this._closed = true;
        _this._retry = 0;
        _this._lastPing = 0;
        _this._rpc = new RpcProvider_1.RpcProvider(function (message) {
            _this._writeStream.write(JSON.stringify(message), 'utf-8');
        }, option.timeout || 10000);
        _this._rpc.registerErrorHandler(function (err) {
            _this.emit("error", err);
        });
        _this._rpc.registerPingHandler(_this._onPing.bind(_this));
        return _this;
    }
    RpcClient.prototype._onPing = function () {
        this._lastPing = Date.now();
        //console.info("xxxx on ping");
    };
    RpcClient.prototype._onConnect = function () {
        var _this = this;
        this._retry = 0;
        this.emit("connect");
        if (this._pingTimer) {
            clearInterval(this._pingTimer);
            this._pingTimer = null;
        }
        this._pingTimer = setInterval(function () {
            if (_this._closed) {
                return;
            }
            _this._rpc.ping();
            if (Date.now() - _this._lastPing > 60000) {
                //连接超时
                _this.reconnect();
            }
        }, 30000);
        this._lastPing = Date.now();
    };
    RpcClient.prototype._onError = function (err) {
        var _this = this;
        var delay = this._retry * 1000;
        var maxDelay = this._option.maxDelay || 10000;
        if (delay > maxDelay) {
            delay = maxDelay;
        }
        setTimeout(function () {
            if (!_this._closed) {
                _this.reconnect();
            }
        }, delay);
        this.emit("error", err);
    };
    RpcClient.prototype.reconnect = function () {
        if (!this._closed) {
            this._closed = true;
            this._socket.destroy();
        }
        this._retry += 1;
        this.connect();
    };
    RpcClient.prototype.connect = function () {
        var _this = this;
        if (!this._closed) {
            return;
        }
        var option = this._option;
        if (option.path)
            this._socket = net_1.createConnection(option.path, this._onConnect.bind(this));
        else if (option.port && option.host)
            this._socket = net_1.createConnection(option.port, option.host, this._onConnect.bind(this));
        else
            throw new Error("no path or port,host param");
        this._readStream = new netstring_1.ReadStream();
        this._socket.pipe(this._readStream);
        this._readStream.on("data", function (data) {
            try {
                var msg = JSON.parse(data.toString('utf-8'));
                _this._rpc.dispatch(msg);
            }
            catch (err) {
                _this._onError(err);
                _this._socket.destroy();
            }
        });
        this._readStream.on("error", this._onError.bind(this));
        this._writeStream = new netstring_1.WriteStream();
        this._writeStream.pipe(this._socket);
        this._socket.on("error", this._onError.bind(this));
        this._socket.on("close", function () {
            _this.emit("close");
        });
        this._closed = false;
    };
    RpcClient.prototype.close = function () {
        if (!this._closed) {
            this._closed = true;
            this._rpc.close();
            this._socket.end();
        }
    };
    RpcClient.prototype.rpc = function (id, payload) {
        return this._rpc.rpc(id, payload);
    };
    RpcClient.prototype.registerSignalHandler = function (id, handler) {
        this._rpc.registerSignalHandler(id, handler);
        return this;
    };
    return RpcClient;
}(events_1.EventEmitter));
exports.RpcClient = RpcClient;
//# sourceMappingURL=RpcClient.js.map