import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CrpcMediaPlayerService } from './crpc/crpc-media-player.service';

@Component({
  selector: 'app-media-player',
  templateUrl: './media-player.component.html',
  styleUrls: ['./media-player.component.scss'],
})
export class MediaPlayerComponent implements OnInit, OnDestroy {
  constructor() {}

  @Input() player: CrpcMediaPlayerService;

  ngOnInit(): void {}
  ngOnDestroy(): void {}
}