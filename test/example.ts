import {RpcClient,RpcServer} from '../src'


function clientExample(){
  const client = new RpcClient({
    port:12340
  });
  client.connect();

  client.rpc("add",{x:1,y:1}).then(rslt=>{
    console.info(rslt);
    client.close();
  }).catch(err=>{
    console.error(err);
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
  server.listen(12340);
}


serverExample();
clientExample();

// ts-node test/example.ts
