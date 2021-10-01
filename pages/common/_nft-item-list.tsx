import {PureComponent} from "react";
import {IListedNFT, INFT} from "./_nft";
import NFTListedItem from "./_nft_listed_item";
import {MarketplaceAPI} from "./_rpcCommon";

export interface NFTListenItemProps {
  query?: any;
  nfts?: IListedNFT[];
  onDataLoad?: (nfts: IListedNFT[]) => void;
  rpc?: MarketplaceAPI;
  page?: number;
  pageSize?: number;
}

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
    })().catch((err) => console.error(err))
  }

  render() {
    return (
      <ul className={"nft-list"}>
        {this.nfts.map((nft: IListedNFT) => {
          return (
            <li key={nft._id}>
              <NFTListedItem nft={nft}></NFTListedItem>
            </li>
          );
        })}
      </ul>
    )
  }
}

export default NFTItemList;
