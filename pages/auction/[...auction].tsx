import SessionComponent, {
  AuthenticatedSubcomponentProps,
  SessionComponentProps,
  SessionComponentState, SubcomponentPropsWithRouter
} from "../common/_session-component";
import * as React from 'react';
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {NFTImg} from "../common/user-nft-page-subComponents/_nft-Img"
import { INFTData, NFT } from "../common/_ntf-collection";
import {toPojo} from "@thirdact/to-pojo";
import styles from "./../../styles/auction.module.css"

import {IUser} from "./../common/_user"

export type AuctionProps = SessionComponentProps&{
  nft: INFTData
};

/**
 * Internal state for the auction page
 */
type AuctionState = SessionComponentState&{
  optSelect: string;
  owner: IUser|unknown;
  payee: IUser[]
};

export class Auction extends SessionComponent<AuctionProps, AuctionState> {

  constructor(props: AuctionProps) {
    super(props);
  }

  state: AuctionState = {
    optSelect : 'Information',
    owner: {},
    payee: []
  }

  componentDidMount() {
    if(this.props.nft.userId) {
      this.getUserById(this.props.nft.userId, (res) => this.setState({ owner: res }))
    }
    }

  onOptSelect = (e) => {
    this.setState({ optSelect: e.target.innerText })
  }

  getUserById = (id, setInState) => {
    this.rpc['marketplace:getUserById'](id)
    .then((res) => {
      setInState(res)
    })
    .catch(this.handleError)
  }

  jsxForOpt = (opt) => {
    let jsx = (<div></div>)
    switch(this.state.optSelect) {
      case 'Information':
        jsx = (
          <div>
            <h4>Description</h4>
            <p>{this.props.nft.description}</p>
            <div>{this.props.nft.tags ? this.props.nft.tags.map((tag,idx) => (<div key={idx}>{tag}</div>)) : ''}</div>
            <p>{'Edition of' + this.props.nft.supply}</p>
            <div>{this.props.nft.nftItem ? 'Asset:' + this.props.nft.nftItem.toString().split('.').pop : ''}</div>
          </div>)
        break;
      case 'Activity':
        jsx = (
          <div>

          </div>
        )
        break;
      case 'Ownership':
        jsx = (
          <div>
            <div className={styles.owner_wrapper}>
              <div className={styles.owner_avatar}></div>
              <div className={styles.owner_data}>
                <div>{this.state.owner ? 'Owned by @' + this.state.owner.email.split('@')[0] : ''}</div>
                <div></div>
              </div>
            </div>
          </div>
        )
        break;
      default:
        this.setState({ optSelect: 'Information' })
        break;
    }
    return jsx
  }

  render() {
    return (
      <div className={styles.auction_wrapper}>
        {this.makeAppBar(this.props.router, 'Auction Listing')}
        {this.props.nft.nftItem ? <NFTImg nftForm={this.props.nft} allowUpload={false} showFooter={false} /> : <NFTImg allowUpload={false} nftForm={{title: '', priceStart:0, listOn: ''}} />}
        <div className={styles.auction_nftHeader}>
          <h2>{this.props.nft.title}</h2>
          <div className={styles.auction_headerSubSection}>
            <div className={styles.ownerMedia}>
              <div>@username</div>
            </div>
            <div>Current bid $ {'{enter amount}'} </div> 
          </div>
        </div>
        <div className={styles.bidButton}>Place a Bid</div>
        <div className={styles.optHeader}>
          <div className={styles.auction_opt} onClick={this.onOptSelect}>Information</div>
          <div className={styles.auction_opt} onClick={this.onOptSelect}>Activity</div>
          <div className={styles.auction_opt} onClick={this.onOptSelect}>Ownership</div>
        </div>
        <div>{this.jsxForOpt(this.state.optSelect)}</div>
      </div>
    )
  }
} 

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Auction.getSession(context);

  let [not_important, not_important2, id, subpage] = req.url.split('/');
   // If no nft id is provided
   if (!id) {
    return {
      redirect: {
        destination: `/`,
        permanent: false
      }
    }
   }

  let nft: INFTData;

  let proj: any = {};

  nft = (await NFT.find({ _id: new ObjectId(id) }, proj).limit(1).exec())[0];

  return {
    props: {
      session,
      subpage: subpage||null,
      nft: toPojo(nft)
    }
  }
}


export default withRouter(Auction);
