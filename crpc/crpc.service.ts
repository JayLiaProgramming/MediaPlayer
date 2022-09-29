import { EventEmitter, Injectable } from '@angular/core';
import { jsonrpcTx } from './jsonrpcTx';

@Injectable({
  providedIn: 'root',
})
export class CrpcService {
  constructor() {}
  public output: EventEmitter<string> = new EventEmitter<string>();

  private sentMessages: {} = {};
  //private _id = 70000;
  private _id = Math.floor(Math.random() * (65535 - 10 + 1)) + 10;

  public ver: string = '1.0';

  private _partial: string = '';
  public addEventHandler(callback) {
    this.sentMessages[1] = callback;
  }
  public parse(message: string) {
    console.log();
    if (message[3] == 'e') {
      //message is done, pass it to the callback handler
      this._partial = `${this._partial}${message.substring(8)}`;
      if (!this._partial.startsWith('{')) {
        this._partial = '';
        return;
      }
      const rpcs = this._partial.split('{"jsonrpc":');
      this._partial = '';
      rpcs.forEach((rpc) => {
        if (rpc != '') {
          const string = decodeURIComponent(escape(`{"jsonrpc":${rpc}`));
          const json = JSON.parse(string);
          if (this.sentMessages[json.id] != undefined) {
            this.sentMessages[json.id](json);
			//remove id so it doesn't try to recall it from another instance that might use this id
            if (json.id != 1) delete this.sentMessages[json.id];
          }
        }
      });
    } else {
      //keep adding data until its full
      this._partial = `${this._partial}${message.substring(8)}`;
    }
  }

  public send(method: string, params: {}, callback: MethodDecorator): number {
    const jrpc = new jsonrpcTx();
    jrpc.id = this._id;
    jrpc.method = method;
    jrpc.params = params;

    // console.log('crpc sending:');
    // console.log(jrpc);

    let data = JSON.stringify(jrpc);
    while (data.length > 0) {
      const partial = data.substring(0, data.length > 247 ? 247 : data.length);
      data = data.replace(partial, '');
      const flag = data.length == 0 ? 'e' : 'c';
      var sendData = `205${flag}00${partial.length.toString(16)}${partial}`;
      this.output.emit(sendData);
    }
    const mId = this._id;
    this.sentMessages[mId] = callback;
    this._id++;
    if (this._id >= 65535) this._id = 1000;
    return mId;
  }

  public generateUuid(): string {
    var lut = [];
    for (var i = 0; i < 256; i++) {
      lut[i] = (i < 16 ? '0' : '') + i.toString(16);
    }
    var d0 = (Math.random() * 0xffffffff) | 0;
    var d1 = (Math.random() * 0xffffffff) | 0;
    var d2 = (Math.random() * 0xffffffff) | 0;
    var d3 = (Math.random() * 0xffffffff) | 0;
    return lut[d0 & 0xff] + lut[(d0 >> 8) & 0xff] + lut[(d0 >> 16) & 0xff] + lut[(d0 >> 24) & 0xff] + '-' + lut[d1 & 0xff] + lut[(d1 >> 8) & 0xff] + '-' + lut[((d1 >> 16) & 0x0f) | 0x40] + lut[(d1 >> 24) & 0xff] + '-' + lut[(d2 & 0x3f) | 0x80] + lut[(d2 >> 8) & 0xff] + '-' + lut[(d2 >> 16) & 0xff] + lut[(d2 >> 24) & 0xff] + lut[d3 & 0xff] + lut[(d3 >> 8) & 0xff] + lut[(d3 >> 16) & 0xff] + lut[(d3 >> 24) & 0xff];
  }
}
