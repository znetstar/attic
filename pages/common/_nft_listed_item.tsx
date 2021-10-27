import {PureComponent} from "react";
import {IListedNFT, INFT} from "./_nft";

import styles from "../../styles/nftList.module.css";

export interface NFTListenItemProps {
  nft: IListedNFT;
}

export class NFTListedItem extends PureComponent<NFTListenItemProps, {}> {
  render() {
    return (
      <div className={styles.nftListedItem}>
        <div className={styles.nftImage}>
          {this.props.nft.image ? (<img src={this.props.nft.image}></img>) : null}
        </div>
        <div className={styles.nftInfo}>
          <div>{ this.props.nft.name }</div>
          <div>{ this.props.nft.sellerInfo.firstName } { this.props.nft.sellerInfo.lastName }</div>
        </div>
      </div>
    )
  }
}

export default NFTListedItem;
