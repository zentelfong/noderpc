/// <reference types="node" />
import { Duplex } from 'stream';
export declare class ReadStream extends Duplex {
    private _buffer;
    constructor();
    _read(size: number): void;
    _write(data: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
}
export declare class WriteStream extends Duplex {
    constructor();
    _read(size: number): void;
    _write(data: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void;
}
