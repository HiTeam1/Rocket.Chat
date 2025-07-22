
// import serializer from "@repo/serialization";
import { Packet } from "socket.io-parser";
import { EventEmitter } from "events";
import { serializer } from "/app/serialization/serializer";

// export const  customParser = {

//   encode :(packet: Packet) => {
//     try {
//       const serializedData = serializer.serialize(packet);
//       return [serializedData];
//     } catch (error) {
//       console.error('Encoding error:', error);
//       return ['{"type": "error", "data": "encoding_failed"}'];
//     }
//   },

//   decode :(data: any) => {
//     try {
//       const packet = serializer.deserialize(data);
//       if (packet === null) {
//         return [{
//           type: 'error',
//           data: 'deserialization_failed'
//         }];
//       }

//       return [packet];
//     } catch (error) {
//       console.error('Decoding error:', error);
//       return [{
//         type: 'error',
//         data: 'decoding_failed'
//       }];
//     }
//   }
// }
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