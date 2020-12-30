import {RpcClient} from "../src/RpcClient"
import {rpcPath,sleepAsync} from './common'


async function test() {
  const client = new RpcClient({
    path:rpcPath()+".test"
  });
  
  let start = Date.now();
  client.connect();
  for(let i=0;i<10000;++i){
    let rslt = await client.rpc("add",{x:i,y:i});
    //console.info(`${i} + ${i} = ${rslt}`);
    //await sleepAsync(1000);
  }

  client.close();

  //10000耗时1.4秒，进程间通讯耗时1.1秒左右
  console.info(`cost ${Date.now() - start} ms`)

  await sleepAsync(1000);
  process.exit(0);
}

async function test2() {
  const client = new RpcClient({
    path:rpcPath()+".test"
  });
  
  let start = Date.now();
  client.connect();

  client.registerSignalHandler("signal11",(msg)=>{
    console.info(msg);
  })
  
  try{
    let rslt = await client.rpc("add",{x:1,y:1});
    console.info(`add ${rslt}`);
  }catch(err){
    console.error(err)
  }

  //await sleepAsync(1000);

  process.exit(0);
}

test();

// ts-node test/testclient.ts


