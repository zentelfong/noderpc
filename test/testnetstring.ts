import {ReadStream,WriteStream} from '../src/netstring'

function test(){
  let readeStream = new ReadStream();
  readeStream.on('data',(data)=>{
    console.info(`data ${data}`);
  })

  readeStream.on('error',(err)=>{
    console.error(err);
  })
  
  readeStream.write("12:hello ");
  readeStream.write("world!,12:hello world!,");
  readeStream.write("12:hello world!,12:hello world!,12:hello world!,");
  
  readeStream.write("this is error,12:hello world!,");

  let writeStream = new WriteStream();
  writeStream.pipe(process.stdout)
  writeStream.write("hello")
  writeStream.write("world43214")
}

test();

// ts-node test/testnetstring.ts

