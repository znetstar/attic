import {EncodeTools, EncodingOptions} from '@etomon/encode-tools/lib/EncodeTools';
import {ImageFormat, SerializationFormat} from "@etomon/encode-tools/lib/EncodeTools";
import {EncodeToolsSerializer} from "multi-rpc-common";
import {EncodeToolsAuto} from "@etomon/encode-tools";

/**
 * Default options passed to `@etomon/encode-tools`
 *
 * These options are important, and determine the client/server communication format for the entire application
 */
export function encodeOptions() {
  return {
    serializationFormat: SerializationFormat.msgpack,
    imageFormat: ImageFormat.jpeg
  } as EncodingOptions;
}

/**
 * Creates a new `EncodeTools` instance with the default encode options
 * @constructor
 */
export function makeEncoder(): EncodeTools {
  return new EncodeToolsAuto(encodeOptions());
}

/**
 * Creates a `multi-rpc` serializer with the default encode options
 * @constructor
 */
export function makeSerializer() {
  return new EncodeToolsSerializer(encodeOptions());
}
