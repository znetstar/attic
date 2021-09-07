import EncodeTools, {ImageFormat, ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import React, {ChangeEvent, PureComponent} from "react";
import {Avatar} from "@material-ui/core";
import {ImageDims} from "@etomon/encode-tools/lib/IEncodeTools";



export interface MarketplaceAvatarProps {
  image?: Buffer;
  onChange: (image: Buffer) => void;
  imageFormat?: ImageFormat;
  allowUpload?: boolean;
  onError?: (error: Error) => void;
  resizeImage?: ImageDims
}

export class MarketplaceAvatar extends PureComponent<MarketplaceAvatarProps> {
  public encoder: EncodeTools = new EncodeTools({
    imageFormat: this.props.imageFormat
  });

  protected inputRef = React.createRef();

  constructor(props: MarketplaceAvatarProps) {
    super(props);
  }

  onFileChange(e: ChangeEvent<any>): void {
    const file = Array.from(e.currentTarget.files as FileList)[0];

    e.preventDefault();
    if (!file) {
      return;
    }

    this.convertAndChangeImage(file)
      .catch((err) => {
        if (this.props.onError)
          this.props.onError(err);
        throw err;
      });
  }

  get mimeType() {
    return ImageFormatMimeTypes.get(this.imageFormat) as string;
  }

  get imageFormat() {
    return this.encoder.options.imageFormat as ImageFormat;
  }

  async convertAndChangeImage(file: File) {
    let newBuffer: ArrayBuffer;
    if (this.props.resizeImage) {
      newBuffer = await this.encoder.resizeImage(await file.arrayBuffer(), this.props.resizeImage);
    } else {
      if (file.type !== this.mimeType) {
        newBuffer = await this.encoder.convertImage(await file.arrayBuffer())
      } else {
        newBuffer = await file.arrayBuffer();
      }
    }

    this.props.onChange(
      Buffer.from(newBuffer)
    );
  }

  public get imageUrl(): string|undefined {
    return this.props.image ? `data:${this.mimeType};base64,${this.props.image.toString('base64')}` : void(0);
  }

  get imageAccept(): string {
    return [
      ImageFormatMimeTypes.get(ImageFormat.jpeg),
      ImageFormatMimeTypes.get(ImageFormat.png)
    ].join(',');
  }

  render() {
    return (
      <div className={"image-wrapper"} onClick={() =>{
        if (this.props.allowUpload) {
          (this.inputRef.current as any).click();
        }
      }}>
        <input style={{ display: 'hidden' }} disabled={!this.props.allowUpload} ref={this.inputRef as any} accept={this.imageAccept} type={'file'} name={"file-input"} onChange={(e) => this.onFileChange(e)}></input>
        <Avatar src={ this.imageUrl } />
      </div>
    )
  }
}
