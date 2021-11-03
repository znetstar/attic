import EncodeTools, {ImageFormat, ImageFormatMimeTypes} from "@etomon/encode-tools/lib/EncodeTools";
import React, {ChangeEvent, PureComponent} from "react";
import Avatar from "@mui/material/Avatar";
import {ImageDims} from "@etomon/encode-tools/lib/IEncodeTools";
import {createStyles, makeStyles } from "@mui/styles";

export interface MarketplaceAvatarProps {
  /**
   * The actual profile image
   */
  image?: string;
  userId: string;
  userImagesPublicPhotoUrl: string;
  /**
   * Called whenever the profile image chnages
   * @param image
   */
  onChange?: (image: string, buf: Uint8Array) => void;
  /**
   * Image format to convert image to upon upload
   */
  imageFormat?: ImageFormat;
  /**
   * Whether to allow the image be replaced by the user
   */
  allowUpload?: boolean;
  /**
   * Called if an exception is thrown
   * @param error
   */
  onError?: (error: Error) => void;
  /**
   * Dimensions to resize the image to upon upload
   */
  resizeImage?: ImageDims;

  /**
   *
   */
  size?: ImageDims;

  avatarOptions?: any;
  variant?: string | null;

}

/**
 * Displays the User's avatar (profile photo) and allows the user to upload a new profile image
 */
export class MarketplaceAvatar extends PureComponent<MarketplaceAvatarProps> {
  public encoder: EncodeTools = new EncodeTools({
    imageFormat: this.props.imageFormat
  });

  protected inputRef = React.createRef();

  constructor(props: MarketplaceAvatarProps) {
    super(props);
  }

  /**
   * Called when the file input associated with the image has been changed
   * @param e
   */
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
    const buf = Buffer.from(newBuffer);
    const im = `data:${this.mimeType};base64,${buf.toString('base64')}`

    this.props.onChange && this.props.onChange(
      im,
      buf
    );
  }

  /**
   * Data URI of the image
   */
  public get imageUrl(): string|undefined {
    return typeof(this.props.image) === 'undefined' ? void(0) :
    typeof(this.props.image) === 'string' ? this.props.image : (
      `data:${this.mimeType};base64,${Buffer.from(this.props.image as any).toString('base64')}`
    );
  }

  /**
   * Acceptable input types, must be accepted by `jimp`
   */
  get imageAccept(): string {
    return [
      ImageFormatMimeTypes.get(ImageFormat.jpeg),
      ImageFormatMimeTypes.get(ImageFormat.png)
    ].join(',');
  }


  get classes(): any {
    return makeStyles((theme: any) =>
      createStyles({
        image: {
          minHeight: this.props.resizeImage?.height,
          minWidth: this.props.resizeImage?.width
        }
      }),
    );
  }

  render() {
    return (
      <div className={"avatar-image-wrapper"} onClick={() =>{
        if (this.props.allowUpload) {
          (this.inputRef.current as any).click();
        }
      }}>
        <input style={{ display: 'hidden' }} disabled={!this.props.allowUpload} ref={this.inputRef as any} accept={this.imageAccept} type={'file'} name={"file-input"} onChange={(e) => this.onFileChange(e)}></input>
        <Avatar
          sx={this.props.size ? this.props.size : ''}
          className={this.classes.image}
          src={ this.imageUrl }
          { ...(this.props.avatarOptions || {}) }
          variant={ this.props.variant ? this.props.variant : null} />
      </div>
    )
  }
}
