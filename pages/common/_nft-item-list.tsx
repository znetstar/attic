import {PureComponent} from "react";
import {IListedNFT, INFT} from "./_nft";
import NFTListedItem from "./_nft_listed_item";
import {MarketplaceAPI} from "./_rpcCommon";
import {SubcomponentPropsWithRouter} from "./_session-component";

import styles from "../../styles/nftList.module.css";

export type NFTListenItemProps = {
  query?: any;
  nfts?: IListedNFT[];
  onDataLoad?: (nfts: IListedNFT[]) => void;
  rpc?: MarketplaceAPI;
  page?: number;
  pageSize?: number;
  clickable?: boolean;
}&SubcomponentPropsWithRouter;

export class NFTItemList extends PureComponent<NFTListenItemProps, {}> {
  get nfts(): IListedNFT[]  {
    return this.props.nfts || [] as IListedNFT[];
  }

  set nfts(val: IListedNFT[])  {
    if (this.props.onDataLoad) {
      this.props.onDataLoad(val);
    }
  }

  async loadNFTs(): Promise<IListedNFT[]> {
    if (!this.props.query && this.props.rpc)
      return [];

    const size = (this.props.pageSize || 10);

    return await (this.props.rpc as MarketplaceAPI)["marketplace:getNFT"](this.props.query, {
      limit: size,
      skip: (this.props.page || 0)*size
    });
  }

  componentDidMount() {
    (async () => {
      const nfts = await this.loadNFTs();
      this.nfts = nfts;
      console.log('ppp', this.nfts)
    })().catch((err) => console.error(err))
  }

  render() {
    return (
      <div className={styles.nftList}>
        {this.nfts.map((nft: IListedNFT) => {
          return (
            <div key={nft._id}>
              <NFTListedItem onClick={this.props.clickable ? (() => this.props.router.push(`/purchase/${nft._id.toString()}`)) : void(0)} nft={nft}></NFTListedItem>
            </div>
          );
        })}
      </div>
    )
  }
}

export default NFTItemList;
