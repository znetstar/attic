import {
  BinaryEncoding,
  EncodeTools,
  EncodingOptions,
  IDFormat,
  ImageFormat,
  SerializationFormat
} from '@etomon/encode-tools/lib/EncodeTools';
import {EncodeToolsSerializer} from "multi-rpc-common";
import {EncodeToolsAuto} from "@etomon/encode-tools";

/**
 * Default options passed to `@etomon/encode-tools`
 *
 * These options are important, and determine the client/server communication format for the entire application
 */
export function encodeOptions(overrides?: EncodingOptions) {
  return {
    ...(overrides||{}),
    serializationFormat: (process.env.WEB_SERIALIZATION_FORMAT || SerializationFormat.cbor) as SerializationFormat,
    imageFormat: ImageFormat.jpeg
  } as EncodingOptions;
}

/**
 * Creates a new `EncodeTools` instance with the default encode options
 * @constructor
 */
export function makeEncoder(): EncodeTools {
  return new EncodeToolsAuto(encodeOptions({
    serializationFormat: (process.env.WEB_SERIALIZATION_FORMAT || SerializationFormat.cbor) as SerializationFormat,
  }));
}

export function makeKeyEncoder(): EncodeTools {
  return new EncodeToolsAuto(encodeOptions({
    binaryEncoding: BinaryEncoding.hex
  }));
}

export function makeInternalCryptoEncoder(): EncodeTools {
  return new   EncodeToolsAuto(encodeOptions({
    binaryEncoding: BinaryEncoding.base85,
    serializationFormat: SerializationFormat.cbor,
    uniqueIdFormat: IDFormat.uuidv4String
  }));
}

/**
 * Creates a `multi-rpc` serializer with the default encode options
 * @constructor
 */
export function makeSerializer() {
  return new EncodeToolsSerializer(encodeOptions());
}
