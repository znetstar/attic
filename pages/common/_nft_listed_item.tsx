import {PureComponent} from "react";
import {IListedNFT, INFT} from "./_nft";

export interface NFTListenItemProps {
  nft: IListedNFT;
}

export class NFTListedItem extends PureComponent<NFTListenItemProps, {}> {
  render() {
    return (
      <div className={"nft-listed-item"}>
        <div className={"nft-image"}>
          {this.props.nft.image ? (<img src={this.props.nft.image}></img>) : null}
        </div>
        <div className={"nft-info"}>
          <div>{ this.props.nft.name }</div>
          <div>{ this.props.nft.sellerInfo.firstName } { this.props.nft.sellerInfo.lastName }</div>
        </div>
      </div>
    )
  }
}

export default NFTListedItem;
