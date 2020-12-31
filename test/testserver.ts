import {RpcServer,RpcConnection} from "../src/RpcServer"
import {rpcPath} from './common'

const server = new RpcServer();

server.registerRpcHandler("add",async (param:{x,y})=>{
  return param.x + param.y
})

server.registerRpcHandler("minus",async (param:{x,y})=>{
  return param.x - param.y
})

server.registerRpcHandler("error",async (param:{x,y})=>{
  throw Error("test error")
})


server.listen(rpcPath() + ".test");

server.on("connect",()=>{
  console.info("connection connect");
})

server.on("close",()=>{
  console.info("connection close");
})

server.on("error",(err:Error)=>{
  console.info("connection error");
  console.error(err);
})



// ts-node test/testserver.ts


