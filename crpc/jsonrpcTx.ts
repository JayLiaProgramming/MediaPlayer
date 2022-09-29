export class jsonrpcTx {
  readonly jsonrpc: string = '2.0';
  method: string;
  id: number | string | null;
  params: {}
}


