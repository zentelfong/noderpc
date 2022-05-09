# noderpc

用于nodejs下进程间的通讯，包含客户端和服务端的实现，使用netstring封装数据包，数据采用json来序列化和反序列化。

RpcServer示例

```js
import {RpcServer} from "noderpc"

const server = new RpcServer();
server.registerRpcHandler("add",async (param:{x,y})=>{
	return param.x + param.y
});
server.listen(12340);
```

RpcClient示例

```js
import {RpcClient} from "noderpc"

const client = new RpcClient({
    host:"127.0.0.1",
	port:12340
});
client.connect();
client.rpc("add",{x:1,y:1}).then(rslt=>{
	console.info(rslt);
	client.close();
});
```

