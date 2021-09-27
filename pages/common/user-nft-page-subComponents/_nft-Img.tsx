import React, {ChangeEvent, PureComponent} from "react";
import Avatar from "@mui/material/Avatar";

import { INFTData } from "./../_ntf-collection";
import styles from './../../../styles/user-nft-pages-subComponents-styles/nft-Img.module.css'

type NftImgProps = {
  allowUpload: true;
  nftForm: INFTData;
  onNftInput: Function;
}|{
  allowUpload: false|undefined;
  nftForm: INFTData;
  onNftInput?: Function;
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
    this.props.onNftInput('nftItem', file)
  }

  render() {
    const { nftForm } = this.props
    return (
      <div className={styles.nftImg_wrapper} onClick={() =>{
        if (this.props.allowUpload) {
          (this.inputRef.current as any).click();
        }
      }}>
        <div className={styles.imgInput}>
          <input className={styles.fileInput} disabled={!this.props.allowUpload} ref={this.inputRef as any} type={'file'} name={"NFT-input"} onChange={(e) => this.onNftAdd(e)}></input>
          <Avatar
            src={this.state.nftUrl}
            variant="square"
            sx={{height: 200, width: '100%', borderRadius: '18px 18px 0 0'}} />
        </div>

        <div className={styles.footer}>
          <div className={styles.metaTitle}>{nftForm.title}</div>
          <div className={styles.metaData}>
            <div>
              <h3 className={styles.metah3}>Starting bid</h3>
              <h2 className={styles.metah2}>{nftForm.priceStart}</h2>
            </div>
            <div>
              <h3 className={styles.metah3}>Ends in</h3>
              <h2 className={styles.metah2}>{nftForm.listOn}</h2>
            </div>
          </div>
        </div>

      </div>
    )
  }
}

export default NFTImg
