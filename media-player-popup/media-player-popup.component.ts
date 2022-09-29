import { Component, Input, OnInit } from '@angular/core';
import { PageType } from 'src/app/services/communications/support/comEnums';
import { PageControlService } from 'src/app/services/page-control.service';
import { PopupBox } from './PopupBox';

@Component({
  selector: 'app-media-player-popup',
  templateUrl: './media-player-popup.component.html',
  styleUrls: ['./media-player-popup.component.scss'],
})
export class MediaPlayerPopupComponent implements OnInit {
  private _popupBox: PopupBox;
  public get popupBox(): PopupBox {
    return this._popupBox;
  }
  @Input()
  public set popupBox(value: PopupBox) {
    this._popupBox = value;
    if (value == undefined) return;
    if (!value.show) this.close();
  }
  popupClass: string = '';
  popupOverlayClass: string = '';
  private _animationTime = 300;
  constructor(public pageService: PageControlService) {}

  ngOnInit(): void {}
  ngAfterContentInit(): void {
    if (this.popupBox == undefined) {
      var stop = true;
    }
    if (!this.popupBox.show) return;
    setTimeout(() => {
      this.popupClass = 'popup-add';
      this.popupOverlayClass = 'popup-overlay-show';
    }, 10);
  }

  close() {
    this.popupClass = '';
    this.popupOverlayClass = '';
    setTimeout(() => {
      this.pageService.removePage(PageType.MediaPopup);
    }, this._animationTime);
  }

  inputChange(event: KeyboardEvent) {
    if (event.key == 'Enter') {
      this.click(0);
    } else this.popupBox.initialUserInput = (<HTMLInputElement>event.target).value;
  }

  click(id: number) {
    this.popupBox.click(id);
    this.close();
  }
}
