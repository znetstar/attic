import SessionComponent, {
  AuthenticatedSubcomponentProps,
  SessionComponentProps,
  SessionComponentState, SubcomponentPropsWithRouter
} from "../common/_session-component";
import * as React from 'react';
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {getUser} from "../api/auth/[...nextauth]";
import {NFTImg} from "../common/user-nft-page-subComponents/_nft-Img"
import { INFTData } from "../common/_ntf-collection";

import styles from "./../../styles/auction.module.css"
import { style } from "@mui/system";

export type AuctionProps = SessionComponentProps&{
  nft: INFTData
};

/**
 * Internal state for the auction page
 */
type AuctionState = SessionComponentState&{
  optSelect: string;
};

export class Auction extends SessionComponent<AuctionProps, AuctionState> {

  constructor(props: AuctionProps) {
    super(props);
  }

  state: AuctionState = {
    optSelect : 'Information'
  }

  onOptSelect = (e) => {
    this.setState({ optSelect: e.target.innerText })
  }

  getUserById = async (id) => {
    return (await getUser(id))?.marketplaceUser;
    
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
        console.log(this.getUserById(this.props.nft.userId))
        jsx = (
          <div>

          </div>
        )
        break;
      default:
        break;

    }
  }

  render() {
    return (
      <div className={styles.auction_wrapper}>
        {this.makeAppBar(this.props.router, 'Auction Listing')}
        {/* <NFTImg nftForm={this.props.nft} allowUpload={false} showFooter={false} /> */}
        <div className={styles.auction_nftHeader}>
          {/* <h2>{this.props.nft.title}</h2> */}
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
  // nft id provided
  // else {
  //   return {
  //     redirect: {
  //       destination: `/auction/${id}${ subpage ? '/'+subpage : '' }`,
  //       permanent: false
  //     }
  //   }
  // }

  const user = (await getUser(session))?.marketplaceUser;

  return {
    props: {
      session,
      subpage: subpage||null
    }
  }
}


export default withRouter(Auction);
