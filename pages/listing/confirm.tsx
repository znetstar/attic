import React, {PureComponent} from "react";
import {INFTData} from "./../common/_ntf-collection";

import styles from "./../../styles/listing/confirm.module.css";

interface NftConfirmProps {
  nft: INFTData;
}

/**
 * NFT confirmation page
 * Mint NFT @ Hadera Platform
 */
export class NFTConfirm extends PureComponent<NftConfirmProps> {

  constructor(props: NftConfirmProps) {
    super(props);
  }

  render() {
    return (
      <div className={styles.confirm_wrapper}>
        Confirm
      </div>
    )
  }
}

export default NFTConfirm
