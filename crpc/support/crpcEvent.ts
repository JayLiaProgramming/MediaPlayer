export class crpcEvent {
  jsonrpc: string;
  method: string;
  params: {
    ev: string;
    handle: string;
    parameters: any;
  };
}
