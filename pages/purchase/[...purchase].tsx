import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
} from "../common/_session-component";
import * as React from 'react';
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {INFT, NFT} from "../common/_nft";
import {toPojo} from "@thirdact/to-pojo";
import {User, IUser} from "./../common/_user"

import styles from "./../../styles/purchase/purchase.module.css"
import { Chip, Box, Tab, Tabs } from '@mui/material';


export type PurchaseProps = SessionComponentProps&{
  canPurchase: boolean;
  nftForm: INFT;
};

export type PurchaseState = SessionComponentState&{
  currentTab: number;
};


export class Purchase extends SessionComponent<PurchaseProps, PurchaseState> {
  constructor(props: PurchaseProps) {
    super(props);
  }

  state = {
    currentTab: 0
  } as PurchaseState

  onPurchase = () => {
    console.log('Purchase NFT')
  }

  getUserById = (userId = this.props.nftForm.sellerId) => {
    if (this.props.nftForm) {
      this.rpc['marketplace:getUserById']({_id: new ObjectId(userId)})
        .then((res) => {console.log( res)})
        .catch(this.handleError)
    } else {
      return 
    }
  }

  render() {
    console.log(this.props)
    return (
    <div className={styles.purchase_wrapper}>
      {this.getUserById()}
      {this.errorDialog}
      {this.makeAppBar(this.props.router, 'Listing')}
      <div className={styles.img_wrapper}></div>
      <div className={styles.nft_info_wrappper}>
        <h2>{this.props.nftForm.name ? this.props.nftForm.name : ''}</h2>
        <div className={styles.nft_info}>
          <div className={styles.nft_owner}>@username</div>
          <div className={styles.nft_price}>{'$' + this.props.nftForm.priceBuyNow}</div>
        </div>
      </div>
      <div className={styles.purchase_Button}>
        <Chip sx={{ width: "80%" }}label="Purchase" onClick={this.onPurchase} />
      </div>
      <div className={styles.nft_tabsPanel}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', width:'100%'}}>
          <Tabs variant="fullWidth" value={this.state.currentTab} onChange={(e, newVal) => {
            this.setState({ currentTab: Number(newVal) })
          }} aria-label="NFT Information Tabs">
            <Tab value={0} label="Information" />
            <Tab value={1} label="Activity" />
            <Tab value={2} label="Ownership" />
          </Tabs>
        </Box>
      </div>
      <div className={styles.nft_extraInfo}>
        <div hidden={!(this.state.currentTab === 0)} className={styles.info}>
          {this.props.nftForm.description ? '\nDescription\n' + this.props.nftForm.description + '\n\n' : 'No Description Available \n'}
          {this.props.nftForm.tags ? this.props.nftForm.tags.map((tag, idx) => <Chip label={tag} key={idx} sx={{ margin:'10px 3px 10px 3px'}} />) : ''}
        </div>
        <div hidden={!(this.state.currentTab === 1)} className={styles.activity}>Activity</div>
        <div hidden={!(this.state.currentTab === 2)} className={styles.ownership}>Ownership</div>
      </div>
    </div>);
  }
}


export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Purchase.getSession(context);

  let [not_important, not_important2, id] = req.url.split('/');

  // If no nft id is provided
  if (!id) {
    return {
      redirect: {
        destination: `/`,
        permanent: false
      }
    }
  }

  // get NFT and return as pojo
  // OR get NFT data as props from parent component
  let nft: INFT;

  nft = (await NFT.find({ _id: new ObjectId(id) }, {}).limit(1).exec())[0];

  if (!nft) {
    return {
      notFound: true
    }
  }

  const nftPojo: any = toPojo(nft);

  return {
    props: {
      session,
      // if acc with 3act, has a wallet and enough hbar then true; else false
      canPurchase: true,
      nftForm: nftPojo
    }
  }
}


export default withRouter(Purchase);
