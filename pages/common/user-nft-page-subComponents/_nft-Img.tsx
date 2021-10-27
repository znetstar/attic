import React, {ChangeEvent, PureComponent} from "react";
import Avatar from "@mui/material/Avatar";
import {SearchBar} from "./../_searchBar"
import { INFT } from "../_nft";
import styles from './../../../styles/user-nft-pages-subComponents-styles/nft-Img.module.css'
import {MarketplaceAvatar} from "../_avatar";
import {IEncodeTools} from "@etomon/encode-tools";
import {makeEncoder} from "../_encoder";

type NftImgProps = {
  allowUpload: true;
  nftForm: INFT;
  onNftInput: Function;
  userImagesPublicPhotoUrl: string;
  enc: IEncodeTools;
  onChange(): void;
}|{
  allowUpload: false|undefined;
  nftForm: INFT;
  onNftInput?: Function;
  userImagesPublicPhotoUrl: string;
  enc: IEncodeTools;
  onChange(): void;
}

type nftImgState = {
  nftUrl: string | undefined ;
}

/**
 * Allows the user to upload a new NFT
 */
export class NFTImg extends PureComponent<NftImgProps> {
  state = {
    nftUrl: ''
  } as nftImgState

  protected inputRef = React.createRef();

  constructor(props: NftImgProps) {
    super(props);
  }

  /**
   * Called when the nft file is Added
   * @param e
   */
  onNftAdd(e: ChangeEvent<any>): void {
    e.preventDefault();
    if (!this.props.allowUpload || !this.props.onNftInput) return;
    const file = Array.from(e.currentTarget.files as FileList)[0];
    if (!file) {
      return;
    }
    const fileUrl = URL.createObjectURL(file)
    this.setState({ nftUrl: fileUrl })
    this.props.onNftInput('image', file)
  }

  get nftUrl(): string|undefined {
    return !this.state.nftUrl ? (this.props.nftForm.imageUrl && (this.props.nftForm.image as any as string) || void(0)) : this.state.nftUrl;
  }

  render() {
    const { nftForm } = this.props
    let b = (nftForm.name || nftForm.priceStart || nftForm.listOn) ? '18px 18px 0 0' : '18px'
    return (
      <div>
        <div className={styles.nftImg_wrapper}>
          <div className={styles.imgInput}>
            <MarketplaceAvatar
              image={this.nftUrl}
              onChange={(image, buf) => {
                if (image)
                  // @ts-ignore
                  nftForm.image = buf;
                this.setState({ nftUrl: image });
                this.props.onChange();
              }}
              resizeImage={{ width: 200 }}
              allowUpload={this.props.allowUpload}
              imageFormat={makeEncoder().options.imageFormat}
              userImagesPublicPhotoUrl={this.props.userImagesPublicPhotoUrl}
              avatarOptions={{variant: "square", sx: {height: 200, width: '100%', borderRadius:b}}}
            ></MarketplaceAvatar>
          </div>

        {(nftForm.name || nftForm.priceStart || nftForm.listOn) ? (
          <div className={styles.footer}>
            <div className={styles.metaTitle}>{nftForm.name}</div>
            <div className={styles.metaData}>
              {nftForm.priceStart ? (
                <div>
                  <h3 className={styles.metah3}>Starting bid</h3>
                  <h2 className={styles.metah2}>{nftForm.priceStart}</h2>
                </div>
              ) : ''}
              {nftForm.listOn ? (
                <div>
                  <h3 className={styles.metah3}>Ends in</h3>
                  <h2 className={styles.metah2}>{nftForm.listOn}</h2>
                </div>
              ) : ''}
            </div>
          </div>
        ) : ''}
        </div>
      </div>
    )
  }
}

export default NFTImg
