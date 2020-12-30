import {Socket,createConnection} from 'net'
import {RpcProvider,SignalHandler} from './RpcProvider'
import {ReadStream,WriteStream} from './netstring'
import {EventEmitter} from 'events'

export interface ClientOption{
  host?:string;
  port?:number;
  path?:string;
  timeout?:number;
  reconnectDelay?:number;
}

export class RpcClient extends EventEmitter{
  private _option:ClientOption;
  private _socket?:Socket;
  private _rpc:RpcProvider;
  private _readStream:ReadStream;
  private _writeStream:WriteStream;
  private _closed:boolean;

  constructor(option:ClientOption){
    super();
    this._option = option;
    this._closed = true;
    this._rpc = new RpcProvider((message,transfer)=>{
      this._writeStream.write(JSON.stringify(message),'utf-8');
    },option.timeout || 10000);

    this._rpc.registerErrorHandler((err)=>{
      this.emit("error",err);
    });
  }

  private _onConnect(){
    this.emit("connect");
  }

  private _onError(err:Error){
    this.emit("error",err);
    setTimeout(() => {
      if(!this._closed){
        this._connect(this._onConnect.bind(this),this._onError.bind(this));
      }
    },this._option.reconnectDelay || 3000);
  }

  connect(){
    this._connect(this._onConnect.bind(this),this._onError.bind(this));
  }


  private _connect(onConnect?:()=>void,onError?:(err:Error)=>void){
    if(!this._closed){
      return;
    }

    let option = this._option;
    if(option.path)
      this._socket = createConnection(option.path,onConnect);
    else
      this._socket = createConnection(option.port,option.host,onConnect);

    this._readStream = new ReadStream();
    this._socket.pipe(this._readStream);
    this._readStream.on("data",(data)=>{
      try{
        let msg = JSON.parse(data as string);
        this._rpc.dispatch(msg);
      }catch(err){
        onError(err);
        this._socket.destroy();
      }
    });

    this._readStream.on("error",onError);
    this._writeStream = new WriteStream();
    this._writeStream.pipe(this._socket);
    this._socket.on("error",onError);
    this._socket.on("close",()=>{
      this.emit("close");
    })
    this._closed = false;
  }

  close(){
    if(!this._closed){
      this._closed = true;
      this._rpc.close();
      this._socket.end(); 
    }
  }

  rpc<T = void, U = void>(id: string, payload?: T): Promise<U> {
    return this._rpc.rpc(id,payload);
  }

  registerSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this {
    this._rpc.registerSignalHandler(id,handler);
    return this;
  }

}

export interface RpcClient{
  on(event: "connect", listener: () => void): this;
  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err:Error) => void): this;
}
