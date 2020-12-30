/// <reference types="node" />
import { Socket, Server } from 'net';
import { RpcProvider, Message, RpcHandler, SignalHandler } from './RpcProvider';
import { EventEmitter } from 'events';
export declare class RpcConnection {
    private _socket;
    private _readStream;
    private _writeStream;
    private _rpc;
    constructor(socket: Socket, rpc: RpcProvider);
    send(message: Message): boolean;
    destroy(): void;
    signal<T = void>(id: string, payload?: T): this;
}
export declare class RpcServer extends EventEmitter {
    protected _server: Server;
    protected _connections: Set<RpcConnection>;
    protected _rpc: RpcProvider;
    constructor();
    listen(pathOrPort: number | string, host?: string): void;
    registerRpcHandler<T = void, U = void>(id: string, handler: RpcHandler<T, U>): this;
    registerSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this;
    private _onConnect;
    private _onClose;
}
export interface RpcServer {
    on(event: "connect", listener: (connection: RpcConnection) => void): this;
    on(event: "close", listener: (connection: RpcConnection) => void): this;
    on(event: "error", listener: (err: Error, connection?: RpcConnection) => void): this;
}
