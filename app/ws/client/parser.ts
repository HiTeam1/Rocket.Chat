
// import serializer from "@repo/serialization";
import { Packet } from "socket.io-parser";
import { EventEmitter } from "events";
import { serializer } from "/app/serialization/serializer";
export class Encoder {
  encode(packet: Packet): any[] {
    return [serializer.serialize(packet)];
  }
}


export class Decoder extends EventEmitter {
  add(data: any): void {
    const packet = serializer.deserialize(data);
    this.emit("decoded", packet);
  }
  destroy(): void {
    this.removeAllListeners();
  }
}

export const parser = { Encoder, Decoder }