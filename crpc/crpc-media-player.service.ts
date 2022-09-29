import { EventEmitter, Injectable, Output } from '@angular/core';
import { plainToClass } from 'class-transformer';
import { PageControlService } from 'src/app/services/page-control.service';
import { Browser } from '../browser/BrowserData';
import { PlayerData } from '../now-playing/PlayerData';
import { CrpcService } from './crpc.service';
import { crpcEvent } from './support/crpcEvent';
import { crpcObject } from './support/crpcObject';

@Injectable({
  providedIn: 'root',
})
export class CrpcMediaPlayerService {
  public set crpcIn(value: string) {
    this.crpc.parse(value);
  }
  @Output() crpcOut: EventEmitter<string>;
  constructor(public crpc: CrpcService, public pageService: PageControlService) {
    this.crpcOut = crpc.output;
    this.playerData = new PlayerData(this);
    this.browser = new Browser(this, pageService);
    this.crpc.addEventHandler(this.eventHandler.bind(this));
  }
  private _uuid: string;
  private _playerUuid: string;

  private _objects: crpcObject[] = [];
  public serverNameInternal: string;

  private _connected: boolean = false;
  public get connected(): boolean {
    return this._connected;
  }
  public set connected(value: boolean) {
    if (this._connected == value) return;
    this._connected = value;
    if (!value) return;
    this.register();
  }
  private _offline: boolean = true;
  public get offline(): boolean {
    return this._offline;
  }
  public set offline(value: boolean) {
    if (this._offline == value) return;
    this._offline = value;
    if (value) return;
    this.register();
  }
  public playerData: PlayerData;
  public browser: Browser;
  public handle: string = 'c5ux';

  public setUuid(uuid: string) {
    this._uuid = uuid;
  }
  public register() {
    if (this.offline || !this.connected) return;
    this.crpc.send(
      'Crpc.Register',
      {
        ver: this.crpc.ver,
        uuid: this._uuid,
        maxPacketSize: 65535,
        type: 'symbol/json-rpc',
        encoding: 'UTF-8',
        format: 'JSON',
        name: 'C5UX MediaPlayer=1',
      },
      this.registerCallback.bind(this)
    );
    this.crpc.send('Crpc.GetObjects', null, this.getObjectsCallback.bind(this));
    this.crpc.send(
      'Crpc.RegisterEvent',
      {
        ev: 'ObjectDirectoryChanged',
        handle: this.handle,
      },
      this.registerEventCallback.bind(this)
    );
  }
  private eventHandler(reply) {
    const eventData: crpcEvent = plainToClass(crpcEvent, reply);
    if (eventData.params.handle != this.handle) return;
    if (eventData.method == `${this.browser.instanceName}.Event`) this.browser.handleEvent(eventData);
    else if (eventData.method == `${this.playerData.instanceName}.Event`) this.playerData.handleEvent(eventData);
  }
  private registerCallback(reply) {
    if (reply.error != null) {
      console.log('error');
      return;
    }
    if (reply.result.ver != this.crpc.ver) {
      console.log('mismatch version');
    }
    this._playerUuid = reply.result.uuid;
  }
  private getObjectsCallback(reply) {
    reply.result.objects.object.forEach((obj: crpcObject) => {
      obj.isIMediaPlayer = obj.interfaces.includes('IMediaPlayer');
      if (obj.isIMediaPlayer) this.playerData.instanceName = obj.instanceName;
      this._objects.push(plainToClass(crpcObject, obj));
    });

    this.crpc.send(
      `${this.playerData.instanceName}.GetMenu`,
      {
        uuid: this._uuid,
      },
      this.getMenuCallback.bind(this)
    );
  }

  private getMenuCallback(reply) {
    this.browser.init(reply.result.instanceName);
    this.playerData.init();
  }
  private registerEventCallback(reply) {
    if (reply.error != null) return;
  }
}
