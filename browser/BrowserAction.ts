import { CrpcService } from '../crpc/crpc.service';

export class BrowserAction {
  constructor() {}
  private _icons = {
    Create: 'fa-solid fa-list-check',
    QuickList: 'fa-solid fa-list-music',
    BackToTop: 'fa-solid fa-home',
  };
  private _label: string;
  public get label(): string {
    return this._label;
  }
  public set label(value: string) {
    this._label = value;
    this.icon = this._icons[value];
  }
  public icon: string;
}
