import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
} from "../common/_session-component";
import * as React from 'react';
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {INFT, NFT} from "../common/_nft";
import {toPojo} from "@thirdact/to-pojo";
import { MarketplaceAvatar } from "../common/_avatar";
import {getUser} from "../api/auth/[...nextauth]";
import {IUser} from "./../common/_user";

import styles from "./../../styles/purchase/purchase.module.css"
import { Chip, Box, Tab, Tabs } from '@mui/material';


export type PurchaseProps = SessionComponentProps&{
  canPurchase: boolean;
  nftForm: INFT;
  user: IUser;
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

  userRender = (infoObj, key:string|number, isOwner:boolean) => {
    let user
    isOwner ? user = infoObj : user = infoObj.owedTo

    let img = user.image ? user.image : ''
    let firstName = user.firstName ? user.firstName : '' 
    let lastName =  user.lastName ? user.lastName : ''
    let date = new Date(this.props.nftForm?.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    let time = new Date(this.props.nftForm?.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    return (
      <div className={styles.user_Wrapper} key={key}>
        <div className={styles.user_avatar}>
          <MarketplaceAvatar
            image={
              typeof(img) === 'string' ? Buffer.from(img, 'base64') : img
            }
            imageFormat={this.enc.options.imageFormat}
            allowUpload={false}
            resizeImage={{height:80, width:80}}
          ></MarketplaceAvatar>
        </div>
        {isOwner ? (
           <div className={styles.user_info}>
            <div className={styles.user_name}>{'Owned by @' + firstName + '_' + lastName}</div>
            <div className={styles.user_created}>{date + ', ' + time}</div>
          </div>
        ) : (
          <div className={styles.user_info}>
            <div className={styles.user_percent}>{infoObj.percent + '%'}</div>
            <div className={styles.user_name}>{'@' + firstName + '_' +lastName}</div>
          </div>
        )}
      </div>
    )
  }

  render() {
    console.log(this.props)
    let image = this.props.nftForm?.image ? this.props.nftForm.image : ''
    let name = this.props.nftForm?.name
    let firstName = this.props.nftForm?.sellerInfo?.firstName ? this.props.nftForm?.sellerInfo?.firstName : '' 
    let lastName =  this.props.nftForm?.sellerInfo?.lastName ? this.props.nftForm?.sellerInfo?.lastName : ''
    let user_firstName = this.props.user?.firstName ? this.props.user?.firstName : '' 
    let user_lastName =  this.props.user?.lastName ? this.props.user?.lastName : ''
    let user_img = this.props.user?.image ? this.props.user.image : ''
    let price =this.props.nftForm.priceBuyNow

    return (
    <div className={styles.purchase_wrapper}>

      {this.errorDialog}
      {this.makeAppBar(this.props.router, 'Purchase Listing')}

      <div className={styles.img_wrapper}></div>

      <div className={styles.nft_info_wrappper}>
        <h2>{name}</h2>
        <div className={styles.nft_info}>
          <div className={styles.curr_user}>
            <MarketplaceAvatar
              image={
                typeof(user_img) === 'string' ? Buffer.from(user_img, 'base64') : user_img
              }
              imageFormat={this.enc.options.imageFormat}
              allowUpload={false}
              resizeImage={{height:35, width:35}}
            ></MarketplaceAvatar>
            <div className={styles.curr_userName}> {'@' + user_firstName + '_' + user_lastName}</div>
          </div>
          <div className={styles.nft_price}>{'$' + price}</div>
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

        <div hidden={!(this.state.currentTab === 2)} className={styles.ownership}>
          {this.userRender(this.props.nftForm.sellerInfo, 'owner', true)}
          <div className={styles.royalty_header}>ROYALTIES</div>
          <div className={styles.royaltyList}>
            {this.props.nftForm.customFees ? this.props.nftForm.customFees.map((payee,idx) => this.userRender(payee, idx, false)) : ''}
          </div>
        </div>

      </div>
    </div>);
  }
}


export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Purchase.getSession(context);

  let [not_important, not_important2, id] = req.url.split('/');

  const user = (await getUser(session))?.marketplaceUser;

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
      nftForm: nftPojo,
      user: user
    }
  }
}


export default withRouter(Purchase);
