import {EncodeTools, EncodingOptions} from '@etomon/encode-tools/lib/EncodeTools';
import {ImageFormat, SerializationFormat} from "@etomon/encode-tools/lib/EncodeTools";
import {EncodeToolsSerializer} from "multi-rpc-common";

export function encodeOptions() {
  return {
    serializationFormat: SerializationFormat.msgpack,
    imageFormat: ImageFormat.jpeg
  } as EncodingOptions;
}

export function MakeEncoder(): EncodeTools {
  return new EncodeTools(encodeOptions());
}

export function MakeSerializer() {
  return new EncodeToolsSerializer(encodeOptions());
}
