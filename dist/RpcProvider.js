"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcProvider = exports.MessageType = void 0;
var MSG_RESOLVE = "resolve";
var MSG_REJECT = "reject";
var MSG_ERROR = "error";
var MSG_CLOSE = "close";
var MSG_PING = "ping";
var MSG_PONG = "pong";
var MessageType;
(function (MessageType) {
    MessageType[MessageType["signal"] = 0] = "signal";
    MessageType[MessageType["rpc"] = 1] = "rpc";
    MessageType[MessageType["internal"] = 2] = "internal";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
;
var RpcProvider = /** @class */ (function () {
    function RpcProvider(_dispatch, _rpcTimeout) {
        if (_rpcTimeout === void 0) { _rpcTimeout = 0; }
        this._dispatch = _dispatch;
        this._rpcTimeout = _rpcTimeout;
        this._errorHandler = null;
        this._closeHandler = null;
        this._pingHandler = null;
        this._rpcHandlers = {};
        this._signalHandlers = {};
        this._pendingTransactions = {};
        this._nextTransactionId = 0;
    }
    RpcProvider.prototype.dispatch = function (payload, transfer) {
        var message = payload;
        switch (message.type) {
            case MessageType.signal:
                return this._handleSignal(message, transfer);
            case MessageType.rpc:
                return this._handeRpc(message, transfer);
            case MessageType.internal:
                return this._handleInternal(message, transfer);
            default:
                this._raiseError("invalid message type " + message.type, transfer);
        }
    };
    RpcProvider.prototype.rpc = function (id, payload, transfer) {
        var _this = this;
        var transactionId = this._nextTransactionId++;
        this._dispatch({
            type: MessageType.rpc,
            transactionId: transactionId,
            id: id,
            payload: payload
        }, transfer ? transfer : undefined);
        return new Promise(function (resolve, reject) {
            var transaction = _this._pendingTransactions[transactionId] = {
                id: transactionId,
                resolve: resolve,
                reject: reject
            };
            if (_this._rpcTimeout > 0) {
                _this._pendingTransactions[transactionId].timeoutHandle =
                    setTimeout(function () { return _this._transactionTimeout(transaction, transfer); }, _this._rpcTimeout);
            }
        });
    };
    RpcProvider.prototype.signal = function (id, payload, transfer) {
        this._dispatch({
            type: MessageType.signal,
            id: id,
            payload: payload,
        }, transfer ? transfer : undefined);
        return this;
    };
    RpcProvider.prototype.close = function (transfer) {
        this._dispatch({
            type: MessageType.internal,
            id: MSG_CLOSE,
        }, transfer ? transfer : undefined);
    };
    RpcProvider.prototype.ping = function (transfer) {
        this._dispatch({
            type: MessageType.internal,
            id: MSG_PING,
        }, transfer ? transfer : undefined);
    };
    RpcProvider.prototype.registerRpcHandler = function (id, handler) {
        if (this._rpcHandlers[id]) {
            throw new Error("rpc handler for " + id + " already registered");
        }
        this._rpcHandlers[id] = handler;
        return this;
    };
    RpcProvider.prototype.registerSignalHandler = function (id, handler) {
        if (!this._signalHandlers[id]) {
            this._signalHandlers[id] = [];
        }
        this._signalHandlers[id].push(handler);
        return this;
    };
    RpcProvider.prototype.deregisterRpcHandler = function (id, handler) {
        if (this._rpcHandlers[id]) {
            delete this._rpcHandlers[id];
        }
        return this;
    };
    RpcProvider.prototype.deregisterSignalHandler = function (id, handler) {
        if (this._signalHandlers[id]) {
            this._signalHandlers[id] = this._signalHandlers[id].filter(function (h) { return handler !== h; });
        }
        return this;
    };
    RpcProvider.prototype.registerErrorHandler = function (handler) {
        this._errorHandler = handler;
        return this;
    };
    RpcProvider.prototype.deregisterErrorHandler = function () {
        this._errorHandler = null;
        return this;
    };
    RpcProvider.prototype.registerCloseHandler = function (handler) {
        this._closeHandler = handler;
        return this;
    };
    RpcProvider.prototype.deregisterCloseHandler = function () {
        this._closeHandler = null;
        return this;
    };
    RpcProvider.prototype.registerPingHandler = function (handler) {
        this._pingHandler = handler;
        return this;
    };
    RpcProvider.prototype.deregisterPingHandler = function () {
        this._pingHandler = null;
        return this;
    };
    RpcProvider.prototype._raiseError = function (error, transfer) {
        if (this._errorHandler)
            this._errorHandler(new Error(error));
        this._dispatch({
            type: MessageType.internal,
            id: MSG_ERROR,
            payload: error
        }, transfer);
    };
    RpcProvider.prototype._dispatchError = function (error, transactionId, transfer) {
        if (this._errorHandler)
            this._errorHandler(new Error(error));
        this._dispatch({
            type: MessageType.internal,
            id: MSG_ERROR,
            payload: error,
            transactionId: transactionId,
        }, transfer);
    };
    RpcProvider.prototype._handleSignal = function (message, transfer) {
        if (!this._signalHandlers[message.id]) {
            return this._dispatchError("invalid signal " + message.id, message.transactionId, transfer);
        }
        this._signalHandlers[message.id].forEach(function (handler) { return handler(message.payload, transfer); });
    };
    RpcProvider.prototype._handeRpc = function (message, transfer) {
        var _this = this;
        if (!this._rpcHandlers[message.id]) {
            return this._dispatchError("invalid rpc " + message.id, message.transactionId, transfer);
        }
        Promise.resolve(this._rpcHandlers[message.id](message.payload, transfer))
            .then(function (result) { return _this._dispatch({
            type: MessageType.internal,
            id: MSG_RESOLVE,
            transactionId: message.transactionId,
            payload: result
        }, transfer); }, function (reason) { return _this._dispatch({
            type: MessageType.internal,
            id: MSG_REJECT,
            transactionId: message.transactionId,
            payload: typeof (reason) === "object" ? reason.stack : reason
        }, transfer); });
    };
    RpcProvider.prototype._handleInternal = function (message, transfer) {
        var transaction = typeof (message.transactionId) !== 'undefined' ? this._pendingTransactions[message.transactionId] : undefined;
        switch (message.id) {
            case MSG_RESOLVE:
                if (!transaction || typeof (message.transactionId) === 'undefined') {
                    return this._raiseError("no pending transaction with id " + message.transactionId, transfer);
                }
                transaction.resolve(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_REJECT:
                if (!transaction || typeof (message.transactionId) === 'undefined') {
                    return this._raiseError("no pending transaction with id " + message.transactionId, transfer);
                }
                this._pendingTransactions[message.transactionId].reject(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_ERROR:
                if (this._errorHandler)
                    this._errorHandler(new Error("remote error: " + message.payload));
                if (!transaction || typeof (message.transactionId) === 'undefined') {
                    return;
                }
                this._pendingTransactions[message.transactionId].reject(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_CLOSE:
                if (this._closeHandler)
                    this._closeHandler(transfer);
                break;
            case MSG_PING:
                this._dispatch({
                    type: MessageType.internal,
                    id: MSG_PONG
                }, transfer);
                break;
            case MSG_PONG:
                if (this._pingHandler)
                    this._pingHandler(transfer);
                break;
            default:
                this._raiseError("unhandled internal message " + message.id, transfer);
                break;
        }
    };
    RpcProvider.prototype._transactionTimeout = function (transaction, transfer) {
        transaction.reject('transaction timed out');
        this._raiseError("transaction " + transaction.id + " timed out", transfer);
        delete this._pendingTransactions[transaction.id];
        return;
    };
    RpcProvider.prototype._clearTransaction = function (transaction) {
        if (typeof (transaction.timeoutHandle) !== 'undefined') {
            clearTimeout(transaction.timeoutHandle);
        }
        delete this._pendingTransactions[transaction.id];
    };
    return RpcProvider;
}());
exports.RpcProvider = RpcProvider;
//# sourceMappingURL=RpcProvider.js.map