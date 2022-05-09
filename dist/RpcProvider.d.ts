export interface RpcHandler<T = void, U = void> {
    (payload: T, transfer: any): Promise<U> | U;
}
export interface SignalHandler<T = void> {
    (payload: T, transfer: any): void;
}
export declare enum MessageType {
    signal = 0,
    rpc = 1,
    internal = 2
}
export interface Dispatcher {
    (message: Message, transfer?: any): void;
}
export interface Message {
    type: MessageType;
    transactionId?: number;
    id: string;
    payload?: any;
}
export declare class RpcProvider {
    private _dispatch;
    private _rpcTimeout;
    constructor(_dispatch: Dispatcher, _rpcTimeout?: number);
    dispatch(payload: any, transfer?: any): void;
    rpc<T = void, U = void>(id: string, payload?: T, transfer?: any): Promise<U>;
    signal<T = void>(id: string, payload?: T, transfer?: any): this;
    close(transfer?: any): void;
    ping(transfer?: any): void;
    registerRpcHandler<T = void, U = void>(id: string, handler: RpcHandler<T, U>): this;
    registerSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this;
    deregisterRpcHandler<T = void, U = void>(id: string, handler: RpcHandler<T, U>): this;
    deregisterSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this;
    registerErrorHandler(handler: (error: Error) => void): this;
    deregisterErrorHandler(): this;
    registerCloseHandler(handler: (transfer: any) => void): this;
    deregisterCloseHandler(): this;
    registerPingHandler(handler: (transfer: any) => void): this;
    deregisterPingHandler(): this;
    private _raiseError;
    private _dispatchError;
    private _handleSignal;
    private _handeRpc;
    private _handleInternal;
    private _transactionTimeout;
    private _clearTransaction;
    private _errorHandler;
    private _closeHandler;
    private _pingHandler;
    private _rpcHandlers;
    private _signalHandlers;
    private _pendingTransactions;
    private _nextTransactionId;
}
