import os from "os"

//获取当前实例id，cluster模式下区分进程使用
export function getInstanceId():number{
  let instanceId = process.env["INSTANCE_ID"]
  if(instanceId){
    return parseInt(instanceId)
  }else{
    return 0
  }
}

//是否是线上环境
export function isProduction(){
  let env = process.env["NODE_ENV"]
  return env == "production"
}

//是否是开发环境
export function isDevelopment(){
  return !isProduction()
}

export function rpcPath(){
  return os.platform() === 'win32' ? '\\\\?\\pipe\\ipc' : '/tmp/unix.sock'
}

