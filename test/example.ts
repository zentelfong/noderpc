import {RpcClient,RpcServer} from '../src'


function clientExample(){
  const client = new RpcClient({
    host:"127.0.0.1",
    port:12340
  });
  client.connect();

  client.rpc("add",{x:1,y:1}).then(rslt=>{
    console.info(rslt);
    //client.close();
  }).catch((reason)=>{
    console.error(`test error:${reason}`);
  })
  
  client.on("error",(err)=>{
    console.error(err);
  })
  client.on("close",()=>{
    console.info("close");
  })
}

function serverExample(){

  const server = new RpcServer();
  server.registerRpcHandler("add",async (param:{x,y})=>{
    return param.x + param.y
  })

  server.registerRpcHandler("error",async (param:{x,y})=>{
    throw new Error("test error")
  })

  server.on("error",(err)=>{
    console.error(err);
  })
  server.listen(12340,"127.0.0.1");
}


serverExample();
clientExample();

// ts-node test/example.ts
