import {EncodeTools} from '@etomon/encode-tools';
import {ImageFormat, SerializationFormat} from "@etomon/encode-tools/lib/EncodeTools";

export function MakeEncoder(): EncodeTools {
  return new EncodeTools({
    serializationFormat: SerializationFormat.msgpack,
    imageFormat: ImageFormat.jpeg
  })
}
