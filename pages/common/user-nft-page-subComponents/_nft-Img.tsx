import React, {ChangeEvent, PureComponent} from "react";
import {Avatar} from "@material-ui/core";

import styles from './../../../styles/user-nft-pages-subComponents-styles/nft-Img.module.css'

interface NftImgProps {
  allowUpload?: boolean;
}

type nftImgState = {
  nft: string | undefined;
  nftUrl: string | undefined ; 
}

/**
 * Allows the user to upload a new NFT
 */
export class NFTImg extends PureComponent<NftImgProps> {
  state = {
    nft: '',
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
    const file = Array.from(e.currentTarget.files as FileList)[0];
    if (!file) {
      return;
    }
    const fileUrl = URL.createObjectURL(file)
    this.setState({ nft: file, nftUrl: fileUrl })
  }

  render() {
    return (
      <div className={styles.nftImg_wrapper} onClick={() =>{
        if (this.props.allowUpload) {
          (this.inputRef.current as any).click();
        }
      }}>
        <div>
          <input className={styles.fileInput} disabled={!this.props.allowUpload} ref={this.inputRef as any} type={'file'} name={"NFT-input"} onChange={(e) => this.onNftAdd(e)}></input>
          <Avatar
            src={this.state.nftUrl} 
            variant="rounded"/>
        </div>

        <div className={styles.footer}>
          <div className={styles.metaTitle}>Michaels Headset</div>
          <div className={styles.metaData}>
            <div>
              <h3 className={styles.metah3}>Starting bid</h3>
              <h2 className={styles.metah2}>$100 USD</h2>
            </div>
            <div>
              <h3 className={styles.metah3}>Ends in</h3>
              <h2 className={styles.metah2}>12h 30m 15s</h2>
            </div>
          </div>
        </div>

      </div>
    )
  }
}

export default NFTImg
