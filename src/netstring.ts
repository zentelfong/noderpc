import {Duplex} from 'stream'

function nsPayloadLength(buf:Buffer,encoding?:BufferEncoding):number {
  var len:number, i:number;
  for (len = 0, i = 0; i < buf.length; i++) {
    var cc = buf[i];

    if (cc === 0x3a) {
      if (i === 0) {
        throw new Error('Invalid netstring with leading \':\'');
      }

      return len;
    }

    if (cc < 0x30 || cc > 0x39) {
      throw new Error('Unexpected character \'' + String.fromCharCode(buf[i])  + '\' found at offset ' + i);
    }

    if (len === 0 && i > 0) {
      throw new Error('Invalid netstring with leading 0');
    }

    len = len * 10 + cc - 0x30;
  }

  // We didn't get a complete length specification
  if (i === buf.length) {
    return -1;
  }

  return len;
}

function nsWriteLength(len:number):number {
  // Negative values are special (see nsPayloadLength()); just return it
  if (len < 0) {
    return len;
  }

  // Compute the number of digits in the length specifier. Stop at
  // any value < 10 and just add 1 later (this catches the case where
  // '0' requires a digit.
  var nslen = len;
  while (len >= 10) {
    nslen += 1;
    len /= 10;
  }

  // nslen + 1 (last digit) + 1 (:) + 1 (,)
  return nslen + 3;
}

function nsPayload(buf:Buffer,encoding?:BufferEncoding):[number,Buffer]{
  if (typeof buf === 'string') {
    buf = Buffer.from(buf, encoding);
  }

  var len = nsPayloadLength(buf);
  if (len < 0) {
    return [len,null];
  }

  var nsLen = nsWriteLength(len);

  // We don't have the entire buffer yet
  if (buf.length - nsLen < 0) {
    return [-1,null];
  }

  var start = nsLen - len - 1;

  return [0,buf.slice(start, start + len)];
}

function nsWrite(pay:Buffer) {
  let len = pay.length;
  let nsLen = nsWriteLength(len);
  let hdrLen = nsLen - len - 1;

  let  buf = Buffer.alloc(nsLen);
  buf.write(len + ':', 0);
  pay.copy(buf, hdrLen);
  buf.write(',', nsLen - 1);
  return buf;
};

export class ReadStream extends Duplex{
  private _buffer:Buffer;

  constructor(){
    super()
  }

  _read(size: number): void{
  }

  _write(data: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void{
    if(!(data instanceof Buffer)){
        data = Buffer.from(data || '', encoding);
    }

    if(this._buffer){
      this._buffer = Buffer.concat([this._buffer,data]);
    }else{
      this._buffer = data;
    }

    while (this._buffer && this._buffer.length > 0) {
      try {
        let [rslt,pay] = nsPayload(this._buffer,encoding);
        if (rslt < 0) {
          break;
        }
        var nsLen = nsWriteLength(pay.length);
        this._buffer = this._buffer.slice(nsLen, this._buffer.length);
        this.emit('data', pay);
      } catch (exception) {
        this.emit('error', exception);
        break;
      }
    }
    callback();
  }
}

export class WriteStream extends Duplex{
  constructor(){
    super()
  }

  _read(size: number): void{
  }

  _write(data: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void{
    if(data instanceof Buffer){
        encoding = undefined;
    }else {
        data = Buffer.from(data || '', encoding);
    }
    this.push(nsWrite(data));
    callback();
  }
}


function test(){
  let readeStream = new ReadStream();
  readeStream.on('data',(data)=>{
    console.info(`data ${data}`);
  })
  
  readeStream.write("12:hello ");
  readeStream.write("world!,12:hello world!,");
  
  
  let writeStream = new WriteStream();
  writeStream.pipe(process.stdout)
  writeStream.write("hello")
  writeStream.write("world43214")
}

//test();

// ts-node src/rpc/netstring.ts
