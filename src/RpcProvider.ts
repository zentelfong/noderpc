const MSG_RESOLVE = "resolve";
const MSG_REJECT = "reject";
const MSG_ERROR = "error";
const MSG_CLOSE = "close";

interface Transaction {
    id: number;
    timeoutHandle?: any;
    resolve(result: any): void;
    reject(error: string): void;
}

export interface RpcHandler<T = void, U = void> {
    (payload: T,transfer:any): Promise<U>|U;
}

export interface SignalHandler<T = void> {
    (payload: T,transfer:any): void;
}

export enum MessageType {
    signal,
    rpc,
    internal
};

export interface Dispatcher {
    (message: Message, transfer?:any): void;
}

export interface Message {
    type: MessageType;
    transactionId?: number;
    id: string;
    payload?: any;
}

export class RpcProvider{

    constructor(
        private _dispatch: Dispatcher,
        private _rpcTimeout = 0
    ) {}

    dispatch(payload: any,transfer?:any): void {
        const message = payload as Message;

        switch (message.type) {
            case MessageType.signal:
                return this._handleSignal(message,transfer);

            case MessageType.rpc:
                return this._handeRpc(message,transfer);

            case MessageType.internal:
                return this._handleInternal(message,transfer);

            default:
                this._raiseError(`invalid message type ${message.type}`,transfer);
        }
    }

    rpc<T = void, U = void>(id: string, payload?: T, transfer?: any): Promise<U> {
        const transactionId = this._nextTransactionId++;

        this._dispatch({
            type: MessageType.rpc,
            transactionId,
            id,
            payload
        }, transfer ? transfer : undefined);

        return new Promise(
            (resolve, reject) => {
                const transaction = this._pendingTransactions[transactionId] = {
                    id: transactionId,
                    resolve,
                    reject
                };

                if (this._rpcTimeout > 0) {
                    this._pendingTransactions[transactionId].timeoutHandle =
                        setTimeout(() => this._transactionTimeout(transaction,transfer), this._rpcTimeout);
                }
            }
        );
    };

    signal<T = void>(id: string, payload?: T, transfer?: any): this {
        this._dispatch({
            type: MessageType.signal,
            id,
            payload,
        }, transfer ? transfer : undefined);
        return this;
    }

    close(transfer?: any) {
        this._dispatch({
            type: MessageType.internal,
            id: MSG_CLOSE,
        }, transfer ? transfer : undefined);
    }

    registerRpcHandler<T = void, U = void>(id: string, handler: RpcHandler<T, U>): this {
        if (this._rpcHandlers[id]) {
            throw new Error(`rpc handler for ${id} already registered`);
        }
        this._rpcHandlers[id] = handler;
        return this;
    };

    registerSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this {
        if (!this._signalHandlers[id]) {
            this._signalHandlers[id] = [];
        }
        this._signalHandlers[id].push(handler);
        return this;
    }

    deregisterRpcHandler<T = void, U = void>(id: string, handler: RpcHandler<T, U>): this {
        if (this._rpcHandlers[id]) {
            delete this._rpcHandlers[id];
        }
        return this;
    };

    deregisterSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this {
        if (this._signalHandlers[id]) {
            this._signalHandlers[id] = this._signalHandlers[id].filter(h => handler !== h);
        }
        return this;
    }

    registerErrorHandler(handler:(error:Error)=>void):this{
        this._errorHandler = handler;
        return this;
    }

    deregisterErrorHandler():this{
        this._errorHandler = null;
        return this;
    }

    registerCloseHandler(handler:(transfer:any)=>void):this{
        this._closeHandler = handler;
        return this;
    }

    deregisterCloseHandler():this{
        this._closeHandler = null;
        return this;
    }

    private _raiseError(error: string,transfer:any): void {
        if(this._errorHandler)
            this._errorHandler(new Error(error));

        this._dispatch({
            type: MessageType.internal,
            id: MSG_ERROR,
            payload: error
        },transfer);
    }

    private _dispatchError(error: string,transactionId:number,transfer:any): void {
        if(this._errorHandler)
            this._errorHandler(new Error(error));

        this._dispatch({
            type: MessageType.internal,
            id: MSG_ERROR,
            payload: error,
            transactionId: transactionId,
        },transfer);
    }


    private _handleSignal(message: Message,transfer:any): void {
        if (!this._signalHandlers[message.id]) {
            return this._dispatchError(`invalid signal ${message.id}`,message.transactionId,transfer);
        }
        this._signalHandlers[message.id].forEach(handler => handler(message.payload,transfer));
    }

    private _handeRpc(message: Message,transfer:any): void {
        if (!this._rpcHandlers[message.id]) {
            return this._dispatchError(`invalid rpc ${message.id}`,message.transactionId,transfer);
        }

        Promise.resolve(this._rpcHandlers[message.id](message.payload,transfer))
            .then(
                (result: any) => this._dispatch({
                    type: MessageType.internal,
                    id: MSG_RESOLVE,
                    transactionId: message.transactionId,
                    payload: result
                },transfer),
                (reason: Error) => this._dispatch({
                    type: MessageType.internal,
                    id: MSG_REJECT,
                    transactionId: message.transactionId,
                    payload: typeof(reason) === "object"?reason.stack:reason
                },transfer)
            );
    }

    private _handleInternal(message: Message,transfer:any): void {
        const transaction = typeof(message.transactionId) !== 'undefined' ? this._pendingTransactions[message.transactionId] : undefined;

        switch (message.id) {
            case MSG_RESOLVE:
                if (!transaction || typeof(message.transactionId) === 'undefined') {
                    return this._raiseError(`no pending transaction with id ${message.transactionId}`,transfer);
                }

                transaction.resolve(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_REJECT:
                if (!transaction || typeof(message.transactionId) === 'undefined') {
                    return this._raiseError(`no pending transaction with id ${message.transactionId}`,transfer);
                }

                this._pendingTransactions[message.transactionId].reject(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_ERROR:
                if(this._errorHandler)
                    this._errorHandler(new Error(`remote error: ${message.payload}`));

                if (!transaction || typeof(message.transactionId) === 'undefined') {
                    return;
                }
                this._pendingTransactions[message.transactionId].reject(message.payload);
                this._clearTransaction(this._pendingTransactions[message.transactionId]);
                break;
            case MSG_CLOSE:
                if(this._closeHandler)
                    this._closeHandler(transfer);
                break;
            default:
                this._raiseError(`unhandled internal message ${message.id}`,transfer);
                break;
        }
    }

    private _transactionTimeout(transaction: Transaction,transfer:any): void {
        transaction.reject('transaction timed out');

        this._raiseError(`transaction ${transaction.id} timed out`,transfer);

        delete this._pendingTransactions[transaction.id];
        return;
    }

    private _clearTransaction(transaction: Transaction): void {
        if (typeof(transaction.timeoutHandle) !== 'undefined') {
            clearTimeout(transaction.timeoutHandle);
        }
        delete this._pendingTransactions[transaction.id];
    }

    private _errorHandler:(error:Error)=>void = null;
    private _closeHandler:(transfer:any)=>void = null;
    private _rpcHandlers: {[id: string]: RpcHandler<any, any>} = {};
    private _signalHandlers: {[id: string]: Array<SignalHandler<any>>} = {};
    private _pendingTransactions: {[id: number]: Transaction} = {};
    private _nextTransactionId = 0;
}


