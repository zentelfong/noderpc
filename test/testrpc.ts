import {RpcProvider} from '../src/RpcProvider'

/*
const rpcProvider = new RpcProvider(
  (message, transfer) =>{
    console.info(message);
    //rpcProvider.dispatch(message)
  },1000
);

rpcProvider.registerRpcHandler('add', (param:{x, y}) => param.x + param.y);


rpcProvider.rpc("add",{x:1,y:1}).then(rslt=>{
  console.info(`add rslt ${rslt}`);
}).catch(reason=>{
  console.info(`add error ${reason}`);
})
*/

let rpcClient:RpcProvider;
let rpcServer:RpcProvider;

rpcServer = new RpcProvider((message,transfer)=>{
  setImmediate(()=>{
    rpcClient.dispatch(message);
  })
})

rpcServer.registerRpcHandler('add', (param:{x, y}) => param.x + param.y);
rpcServer.registerRpcHandler('minus', (param:{x, y}) => param.x - param.y);

//注意async，如果没有async，异常将不会被捕获
rpcServer.registerRpcHandler('error',async (param:{x, y})=>{
  throw new Error("test error")
});

rpcClient = new RpcProvider((message,transfer)=>{
  setImmediate(()=>{
    rpcServer.dispatch(message);
  })
})

rpcClient.registerErrorHandler((err)=>{
  console.error(err)
})


rpcClient.rpc("error",{x:1,y:1}).then(rslt=>{
  console.info(`add rslt ${rslt}`);
}).catch(reason=>{
  console.info(`add error ${reason}`);
  rpcClient.close();
})


// ts-node test/testrpc.ts


