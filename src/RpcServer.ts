import {Socket,Server} from 'net'
import {RpcProvider,Message,RpcHandler,SignalHandler} from './RpcProvider'
import {ReadStream,WriteStream} from './netstring'
import {EventEmitter} from 'events'
import * as fs from 'fs'

export class RpcConnection{
  private _socket:Socket;
  private _readStream:ReadStream;
  private _writeStream:WriteStream;
  private _rpc:RpcProvider;

  constructor(socket:Socket,rpc:RpcProvider){
    this._socket = socket;
    this._readStream = new ReadStream();
    this._rpc = rpc;

    socket.pipe(this._readStream);
    this._readStream.on('data',(data)=>{
      try{
        let msg = JSON.parse(data as string);
        this._rpc.dispatch(msg,this);
      }catch(err){
        this._socket.destroy(err);
      }
    });

    this._readStream.on("error",(err:Error)=>{
      this._socket.destroy(err);
    })

    this._writeStream = new WriteStream();
    this._writeStream.pipe(socket)
  }

  send(message:Message):boolean{
    return this._writeStream.write(JSON.stringify(message),'utf-8');
  }

  destroy(){
    this._socket.destroy();
  }

  signal<T = void>(id: string, payload?: T):this{
    this._rpc.signal(id,payload,this);
    return this;
  }
}

export class RpcServer extends EventEmitter{
  protected _server:Server;
  protected _connections:Set<RpcConnection>;
  protected _rpc:RpcProvider;

  constructor(){
    super();

    this._rpc = new RpcProvider(function (message:Message,conn:RpcConnection){
      conn.send(message);
    });
    this._rpc.registerCloseHandler((conn:RpcConnection)=>{
      conn.destroy();
    });

    this._rpc.registerErrorHandler((err)=>{
      this.emit('error',err);
    });
    this._connections = new Set<RpcConnection>();
    this._server = new Server(this._onConnect.bind(this));

    this._server.on('error', (err:Error) => {
      this.emit('error',err);
    });
  }

  listen(pathOrPort:number|string,host?:string){
    if(host){
      this._server.listen(pathOrPort as number,host);
    }else{
      if(typeof(pathOrPort) !== "number"){
        //如果使用path，则先要删除文件
        if(fs.existsSync(pathOrPort)){
          fs.unlinkSync(pathOrPort);
        }
      }
      this._server.listen(pathOrPort);
    }
  }

  registerRpcHandler<T = void, U = void>(id: string, handler: RpcHandler<T, U>): this {
    this._rpc.registerRpcHandler(id,handler);
    return this;
  }

  registerSignalHandler<T = void>(id: string, handler: SignalHandler<T>): this {
    this._rpc.registerSignalHandler(id,handler);
    return this;
  }

  private _onConnect(socket:Socket){
    let connection = new RpcConnection(socket,this._rpc);
    socket.on('close',()=>{
      this._onClose(connection);
    });

    socket.on('error',(err)=>{
      this.emit('error',err,connection);
    });

    this._connections.add(connection);
    this.emit('connect',connection);
  }

  private _onClose(connection:RpcConnection){
    this._connections.delete(connection);
    this.emit('close',connection);
  }
}

export interface RpcServer{
  on(event: "connect", listener: (connection:RpcConnection) => void): this;
  on(event: "close", listener: (connection:RpcConnection) => void): this;
  on(event: "error", listener: (err:Error,connection?:RpcConnection) => void): this;
}
