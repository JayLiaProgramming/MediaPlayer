import { plainToClass } from 'class-transformer';
import { PageType } from 'src/app/services/communications/support/comEnums';
import { PageControlService } from 'src/app/services/page-control.service';
import { CrpcMediaPlayerService } from '../crpc/crpc-media-player.service';
import { crpcEvent } from '../crpc/support/crpcEvent';
import { PopupBox } from '../media-player-popup/PopupBox';
import { BusyState } from '../now-playing/PlayerData';
import { BrowserAction } from './BrowserAction';
import { BrowserLine } from './BrowserLine';

export class Browser {
  public instanceName: string;

  private _initialEvents: string[] = ['BusyChanged', 'ClearChanged', 'ListChanged', 'StateChanged', 'StatusMsgMenuChanged'];
  private _initialProperties: string[] = ['MaxReqItems', 'Level', 'StatusMsgMenu', 'Instance'];
  private _listProperties: string[] = ['IsMenuAvailable', 'ListSpecificFunctions', 'Title', 'Subtitle', 'TransactionId', 'ItemCnt'];

  private _listSpecificFunctions: string[];
  public set listSpecificFunctions(value: string[]) {
    if (this._listSpecificFunctions == value) return;
    this._listSpecificFunctions = value;
    this.listActions = [];
    if (value == undefined) return;
    value.forEach((func) => {
      const action = new BrowserAction();
      action.label = func;
      this.listActions.push(action);
    });
  }
  private maxReqItems: number;
  private _itemCnt: number;
  public get itemCnt(): number {
    return this._itemCnt;
  }
  private set itemCnt(value: number) {
    this._itemCnt = value;
    this._itemStart = 0;
    this._itemCount = this.itemCnt - this._itemStart;
    if (this._itemCount > this.maxReqItems) this._itemCount = this.maxReqItems;
    this.tryGetMenu();
  }
  private _itemCount: number;
  private _itemStart: number = 0;

  private _title: string;
  public get title(): string {
    return this._title;
  }
  public set title(value: string) {
    if (this._title == value) return;
    this._title = value;
    if (value != undefined) this.getList();
  }
  public subtitle: string;
  public isMenuAvailable: boolean;
  public statusMsgMenu: any;
  public busy: BusyState;
  public popupBox: PopupBox;
  public listActions: BrowserAction[];
  private _lastSelectedItem: string;
  public level: number;
  public listItems: BrowserLine[];

  constructor(public mediaPlayer: CrpcMediaPlayerService, public pageService: PageControlService) {}

  public init(instanceName: string) {
    this.instanceName = instanceName;
    this._initialEvents.forEach((eventName) => {
      this.mediaPlayer.crpc.send(
        `${this.instanceName}.RegisterEvent`,
        {
          ev: eventName,
          handle: this.mediaPlayer.handle,
        },
        this.registerEventCallback.bind(this)
      );
    });
    this._initialProperties.forEach((propName) => {
      this.mediaPlayer.crpc.send(
        `${this.instanceName}.GetProperty`,
        {
          propName: propName,
        },
        this.getPropertyCallback.bind(this)
      );
    });
    this.getList();
  }
  public getList() {
    this._listProperties.forEach((propName) => {
      this.mediaPlayer.crpc.send(
        `${this.instanceName}.GetProperty`,
        {
          propName: propName,
        },
        this.getPropertyCallback.bind(this)
      );
    });
  }
  public selectListItem(itemIndex: number) {
    this._lastSelectedItem = this.listItems[itemIndex].title;
    this.mediaPlayer.crpc.send(
      `${this.instanceName}.Select`,
      {
        item: itemIndex + 1,
      },
      this.genericActionCallback.bind(this)
    );
  }
  public selectListAction(actionIndex: number) {
    this.mediaPlayer.crpc.send(`${this.instanceName}.${this.listActions[actionIndex].label}`, null, this.genericActionCallback.bind(this));
  }
  public back() {
    this.mediaPlayer.crpc.send(`${this.instanceName}.Back`, null, this.genericActionCallback.bind(this));
  }
  public handleEvent(eventData: crpcEvent) {
    switch (eventData.params.ev) {
      case 'BusyChanged':
        this.busy = eventData.params.parameters;
        break;
      case 'ClearChanged':
        this.listSpecificFunctions = undefined;
        this.title = undefined;
        this.subtitle = undefined;
        this.isMenuAvailable = undefined;
        this.statusMsgMenu = undefined;
        this.busy = undefined;
        this.listItems = undefined;
        this.popupBox = undefined;
        break;
      case 'ListChanged':
        console.log(`Browser ListChanged`);
        console.log(eventData);
        break;
      case 'StateChanged':
        if (eventData.params.parameters.Title && eventData.params.parameters.Level) {
          //browser changed level
          this.title = eventData.params.parameters.Title;
          this.level = eventData.params.parameters.Level;
        }
        break;
      case 'StatusMsgMenuChanged':
        //console.log(`Browser StatusMsgMenuChanged`);
        //console.log(eventData);
        if (this.popupBox != undefined) {
          setTimeout(() => {
            this.createPopupBox(eventData.params.parameters);
          }, 300);
        } else this.createPopupBox(eventData.params.parameters);
        break;
    }
  }
  private createPopupBox(data) {
    if (this.pageService.config.activeMediaArea?.activeSource?.mediaPlayer == undefined) return;
    this.popupBox = plainToClass(PopupBox, data);
    this.popupBox.crpc = this.mediaPlayer.crpc;
    this.popupBox.instanceName = this.instanceName;
    this.popupBox.title = this._lastSelectedItem;
    this.pageService.addPage(PageType.MediaPopup, true);
  }
  private registerEventCallback(reply) {
    // console.log(`registerEventCallback`);
    // console.log(reply);
  }
  private getPropertyCallback(reply) {
    if (reply.error) {
      //   console.log('browser getPropertyCallback error');
      //   console.log(reply);
      return;
    }
    const propName: string = Object.keys(reply.result)[0];
    const camelPropName: string = this.toCamelCase(propName);
    this[camelPropName] = reply.result[propName];
  }
  private tryGetMenu() {
    //console.log(`[ ${this.instanceName} ] Trying to get menu from ${this._itemStart + 1} for ${this._itemCount} items`);
    if (this.level == undefined || this.itemCnt == undefined) return;
    this.mediaPlayer.crpc.send(
      `${this.instanceName}.GetData`,
      {
        count: this._itemCount,
        item: this._itemStart + 1,
      },
      this.getMenuCallback.bind(this)
    );
  }

  private getMenuCallback(reply) {
    if (reply.error) {
      console.log('browser getMenuCallback error');
      console.log(reply);
      return;
    }
    if (this._itemStart == 0) this.listItems = [];
    if (reply.result instanceof Array) {
      reply.result.forEach((lineData) => {
        const newLine = new BrowserLine();
        newLine.title = lineData.L1;
        newLine.subtitle = lineData.L2;
        newLine.url = lineData.URL;
        this.listItems.push(newLine);
      });
      if (this._itemCount + this._itemStart != this.itemCnt) {
        this._itemStart = this._itemStart + this._itemCount;
        this._itemCount = this.itemCnt - this._itemStart > 100 ? 100 : this.itemCnt - this._itemStart;
        this.tryGetMenu();
      }
    } else console.log(reply);
  }
  private genericActionCallback(reply) {
    //this is a callback that really just has a success or failed message
    if (reply.error) {
      //   console.log('browser genericActionCallback error');
      //   console.log(reply);
      return;
    }
  }

  private toCamelCase(str = '') {
    return str
      .replace(/(?:^\w|\[A-Z\]|\b\w)/g, (word, index) => {
        return index === 0 ? word.toLowerCase() : word.toUpperCase();
      })
      .replace(/\s+/g, '');
  }
}
