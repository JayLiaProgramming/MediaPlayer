import { CrpcMediaPlayerService } from '../crpc/crpc-media-player.service';
import { crpcEvent } from '../crpc/support/crpcEvent';

export interface BusyState {
  on: boolean;
  timeoutSec: number;
}
export interface Rating {
  current: number;
  max: number;
  system: number;
}

export class PlayerData {
  constructor(public mediaPlayer: CrpcMediaPlayerService) {}

  private _properties: string[];
  private _initialEvents: string[] = ['BusyChanged', 'StateChanged', 'StateChangedByBrowseContext', 'StatusMsgChanged'];
  private _lastId: number = undefined;

  private _iconLookup = {
    ThumbsUp: 'fas fa-thumbs-up',
    ThumbsDown: 'fas fa-thumbs-down',
    Shuffle: 'fas fa-random',
    Repeat: 'fas fa-redo-alt',
    Play: 'far fa-circle fa-play-circle',
    Pause: 'far fa-circle fa-pause-circle',
    PreviousTrack: 'fas fa-fast-backward',
    NextTrack: 'fas fa-fast-forward',
  };

  public instanceName;

  public track: string;
  public artist: string;
  public album: string;
  public station: string;
  public composer: string;
  public title: string;
  public stationName: string;

  public transports: {} = {};

  public set textLines(value) {
    this.track = value[0];
    this.artist = value[1];
    this.album = value[2];
    this.station = value[3];
  }
  private set actionsAvailable(value: string[]) {
    this.transports = {};
    value.forEach((action) => {
      if (this._iconLookup[action] == undefined) return;
      this.transports[action] = {
        icon: this._iconLookup[action],
        action: action,
      };
    });
  }
  private set actionsSupported(value: string[]) {
    // console.log('PlayerData actionsSupported');
    // console.log(value);
  }
  //TODO: write in processor fetching for artwork for remote connections
  public albumArtUrl: string;
  public busy: BusyState;
  public elapsedSec: number;
  public trackSec: number;
  public rewindSpeed: number;
  public ffwdSpeed: number;
  public instance: number;
  public language: string;
  public mediaReady: boolean;
  public mediaType: any;
  public playerIconURL: string;
  public playerName: string;
  public playerState: string;
  public progressBar: boolean;
  public providerName: string;
  public rating: Rating;
  public repeatState: number;
  public shuffleState: number;
  public trackCnt: number;
  public trackNum: number;
  public version: number;

  public init() {
    this.mediaPlayer.crpc.send(
      `${this.instanceName}.GetProperty`,
      {
        propName: 'TextLines',
      },
      this.getTextLinesCallback.bind(this)
    );
    this.mediaPlayer.crpc.send(
      `${this.instanceName}.GetProperty`,
      {
        propName: 'PropertiesSupported',
        handle: this.mediaPlayer.handle,
      },
      this.getPropertiesSupportedCallback.bind(this)
    );
    this._initialEvents.forEach((eventName) => {
      this._lastId = this.mediaPlayer.crpc.send(
        `${this.instanceName}.RegisterEvent`,
        {
          ev: eventName,
          handle: this.mediaPlayer.handle,
        },
        this.registerEventCallback.bind(this)
      );
    });
  }
  public handleEvent(eventData: crpcEvent) {
    switch (eventData.params.ev) {
      case 'BusyChanged':
        this.busy = eventData.params.parameters;
        break;
      case 'ClearChanged':
        this.actionsAvailable = [];
        this.albumArtUrl = undefined;
        this.busy = undefined;
        this.elapsedSec = undefined;
        this.trackSec = undefined;
        this.rewindSpeed = undefined;
        this.ffwdSpeed = undefined;
        this.instance = undefined;
        this.language = undefined;
        this.mediaReady = undefined;
        this.mediaType = undefined;
        this.playerIconURL = undefined;
        this.playerName = undefined;
        this.playerState = undefined;
        this.progressBar = undefined;
        this.providerName = undefined;
        this.rating = undefined;
        this.repeatState = undefined;
        this.shuffleState = undefined;
        this.trackCnt = undefined;
        this.trackNum = undefined;
        this.version = undefined;
        this.track = undefined;
        this.artist = undefined;
        this.album = undefined;
        this.station = undefined;
        this.composer = undefined;
        this.title = undefined;
        this.stationName = undefined;
        break;
      case 'StateChanged':
        const propName: string = Object.keys(eventData.params.parameters)[0];
        const camelPropName = this.toCamelCase(propName);
        this[camelPropName] = eventData.params.parameters[propName];
        //if (propName != 'ElapsedSec') console.log(this);
        break;
      case 'StateChangedByBrowseContext':
        console.log('PlayerData StateChangedByBrowseContext.... Not sure what to do with this yet');
        break;
      case 'StatusMsgChanged':
        console.log('PlayerData StatusMsgChanged.... Not sure what to do with this yet');
        break;
    }
  }
  private _seekTimeout;
  public seek(event: Event) {
    if (this._seekTimeout != undefined) clearTimeout(this._seekTimeout);
    this._seekTimeout = setTimeout(() => {
      const val = Number((<HTMLInputElement>event.target).value);
      //{"method":"MirageMediaPlayer1.Seek","id":14802,"jsonrpc":"2.0","params":{"time":71}}
      this.mediaPlayer.crpc.send(
        `${this.instanceName}.Seek`,
        {
          time: val,
        },
        this.registerEventCallback.bind(this)
      );
      this._seekTimeout = undefined;
    }, 100);
  }
  transportCommand(event: MouseEvent) {
    const command = this.getDataCommand(event.target);
    if (command != undefined) this.mediaPlayer.crpc.send(`${this.instanceName}.${command}`, null, this.registerEventCallback.bind(this));
  }
  private registerEventCallback(reply) {
    if (this._lastId == undefined) return;
    if (reply.id == this._lastId) {
      if (this._properties == undefined) {
        var stop = true;
      }
      this._properties.forEach((propName) => {
        this._lastId = this.mediaPlayer.crpc.send(
          `${this.instanceName}.GetProperty`,
          {
            propName: propName,
          },
          this.getPropertiesCallback.bind(this)
        );
      });
    }
  }
  private getPropertiesCallback(reply) {
    const propName: string = Object.keys(reply.result)[0];
    const camelPropName: string = this.toCamelCase(propName);
    this[camelPropName] = reply.result[propName];
  }
  private getPropertiesSupportedCallback(reply) {
    this._properties = reply.result.PropertiesSupported;
  }
  private getTextLinesCallback(reply) {
    this.textLines = reply.result.TextLines;
  }
  private toCamelCase(str = '') {
    return str
      .replace(/(?:^\w|\[A-Z\]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }
  public toTimeString(time: number): string {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${this.zeroPadding(minutes, 2)}:${this.zeroPadding(seconds, 2)}`;
  }
  private zeroPadding(num: number, digit: number) {
    var zero = '';
    for (var i = 0; i < digit; i++) {
      zero += '0';
    }
    return (zero + num).slice(-digit);
  }
  private getDataCommand(target: EventTarget): any {
    let el: HTMLElement = <HTMLElement>target;
    let command: string = undefined;
    while (command == undefined) {
      if (el == null) break;
      command = el.dataset.command;
      if (command == undefined) el = el.parentElement;
    }
    if (command != undefined) {
      return command;
    }

    return undefined;
  }
}
