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
        _this._rpc = new RpcProvider_1.RpcProvider(function (message, transfer) {
            _this._writeStream.write(JSON.stringify(message), 'utf-8');
        }, option.timeout || 10000);
        _this._rpc.registerErrorHandler(function (err) {
            _this.emit("error", err);
        });
        return _this;
    }
    RpcClient.prototype._onConnect = function () {
        this.emit("connect");
    };
    RpcClient.prototype._onError = function (err) {
        var _this = this;
        this.emit("error", err);
        setTimeout(function () {
            if (!_this._closed) {
                _this._connect(_this._onConnect.bind(_this), _this._onError.bind(_this));
            }
        }, this._option.reconnectDelay || 3000);
    };
    RpcClient.prototype.connect = function () {
        this._connect(this._onConnect.bind(this), this._onError.bind(this));
    };
    RpcClient.prototype._connect = function (onConnect, onError) {
        var _this = this;
        if (!this._closed) {
            return;
        }
        var option = this._option;
        if (option.path)
            this._socket = net_1.createConnection(option.path, onConnect);
        else
            this._socket = net_1.createConnection(option.port, option.host, onConnect);
        this._readStream = new netstring_1.ReadStream();
        this._socket.pipe(this._readStream);
        this._readStream.on("data", function (data) {
            try {
                var msg = JSON.parse(data);
                _this._rpc.dispatch(msg);
            }
            catch (err) {
                onError(err);
                _this._socket.destroy();
            }
        });
        this._readStream.on("error", onError);
        this._writeStream = new netstring_1.WriteStream();
        this._writeStream.pipe(this._socket);
        this._socket.on("error", onError);
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