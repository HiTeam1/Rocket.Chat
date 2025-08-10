
import { pack, unpack } from "msgpackr";


export class MsgPackrSerializer {
    serialize<T>(data: T): Buffer {
        try {
            return pack(data);
        } catch (err) {
            console.log(err)
            throw new Error("Failed to serialize data",);
        }
    }

    deserialize<T>(buffer: Buffer): T {
        try {
            return unpack(buffer) as T;
        } catch (err) {
            console.log(err)
            throw new Error("Failed to deserialize data");
        }
    }
}

export const serializer = new MsgPackrSerializer();