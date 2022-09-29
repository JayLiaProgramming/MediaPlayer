import { CrpcService } from '../crpc/crpc.service';

export class PopupBox {
  constructor() {}
  crpc: CrpcService;
  instanceName: string;
  title: string;
  text: string;
  timeoutSec: number;
  userInputRequired: string;
  initialUserInput: string;
  show: boolean;
  textForItems: string[];

  //not sure what this means yet :/
  localExit: boolean;

  click(id: number) {
    this.crpc.send(
      `${this.instanceName}.StatusMsgResponseMenu`,
      {
        localExit: this.localExit,
        state: 1,
        id: id + 1,
        userInput: this.initialUserInput,
      },
      this.popupButtonCallback.bind(this)
    );
  }
  private popupButtonCallback(reply) {
    if (reply.error != null) {
      console.log('Popup Button Click ERROR!');
      console.log(reply.error);
    }
  }
}
