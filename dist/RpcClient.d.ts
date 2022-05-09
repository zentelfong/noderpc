/// <reference types="node" />
import { SignalHandler } from './RpcProvider';
import { EventEmitter } from 'events';
export interface ClientOption {
    host?: string;
    port?: number;
    path?: string;
    timeout?: number;
    maxDelay?: number;
}
export declare class RpcClient extends EventEmitter {
    private _option;
    private _socket?;
    private _rpc;
    private _readStream;
    private _writeStream;
    private _closed;
    private _retry;
    private _pingTimer;
    private _lastPing;
    constructor(option: ClientOption);
    private _onPing;
    private _onConnect;
    private _onError;
    reconnect(): void;
    connect(): void;
    close(): void;
    rpc<T = void, U = void>(id: string, payload?: T): Promise<U>;
    registerSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this;
}
export interface RpcClient {
    on(event: "connect", listener: () => void): this;
    on(event: "close", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
}
