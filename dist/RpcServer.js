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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcServer = exports.RpcConnection = void 0;
var net_1 = require("net");
var RpcProvider_1 = require("./RpcProvider");
var netstring_1 = require("./netstring");
var events_1 = require("events");
var fs = __importStar(require("fs"));
var RpcConnection = /** @class */ (function () {
    function RpcConnection(socket, rpc) {
        var _this = this;
        this._socket = socket;
        this._readStream = new netstring_1.ReadStream();
        this._rpc = rpc;
        socket.pipe(this._readStream);
        this._readStream.on('data', function (data) {
            try {
                var msg = JSON.parse(data);
                _this._rpc.dispatch(msg, _this);
            }
            catch (err) {
                _this._socket.destroy(err);
            }
        });
        this._readStream.on("error", function (err) {
            _this._socket.destroy(err);
        });
        this._writeStream = new netstring_1.WriteStream();
        this._writeStream.pipe(socket);
    }
    RpcConnection.prototype.send = function (message) {
        return this._writeStream.write(JSON.stringify(message), 'utf-8');
    };
    RpcConnection.prototype.destroy = function () {
        this._socket.destroy();
    };
    RpcConnection.prototype.signal = function (id, payload) {
        this._rpc.signal(id, payload, this);
        return this;
    };
    return RpcConnection;
}());
exports.RpcConnection = RpcConnection;
var RpcServer = /** @class */ (function (_super) {
    __extends(RpcServer, _super);
    function RpcServer() {
        var _this = _super.call(this) || this;
        _this._rpc = new RpcProvider_1.RpcProvider(function (message, conn) {
            conn.send(message);
        });
        _this._rpc.registerCloseHandler(function (conn) {
            conn.destroy();
        });
        _this._rpc.registerErrorHandler(function (err) {
            _this.emit('error', err);
        });
        _this._connections = new Set();
        _this._server = new net_1.Server(_this._onConnect.bind(_this));
        _this._server.on('error', function (err) {
            _this.emit('error', err);
        });
        return _this;
    }
    RpcServer.prototype.listen = function (pathOrPort, host) {
        if (host) {
            this._server.listen(pathOrPort, host);
        }
        else {
            if (typeof (pathOrPort) !== "number") {
                //如果使用path，则先要删除文件
                if (fs.existsSync(pathOrPort)) {
                    fs.unlinkSync(pathOrPort);
                }
            }
            this._server.listen(pathOrPort);
        }
    };
    RpcServer.prototype.registerRpcHandler = function (id, handler) {
        this._rpc.registerRpcHandler(id, handler);
        return this;
    };
    RpcServer.prototype.registerSignalHandler = function (id, handler) {
        this._rpc.registerSignalHandler(id, handler);
        return this;
    };
    RpcServer.prototype._onConnect = function (socket) {
        var _this = this;
        var connection = new RpcConnection(socket, this._rpc);
        socket.on('close', function () {
            _this._onClose(connection);
        });
        socket.on('error', function (err) {
            _this.emit('error', err, connection);
        });
        this._connections.add(connection);
        this.emit('connect', connection);
    };
    RpcServer.prototype._onClose = function (connection) {
        this._connections.delete(connection);
        this.emit('close', connection);
    };
    return RpcServer;
}(events_1.EventEmitter));
exports.RpcServer = RpcServer;
//# sourceMappingURL=RpcServer.js.map