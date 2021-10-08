import SessionComponent, {
  SessionComponentProps,
  SessionComponentState, SubcomponentPropsWithRouter
} from "../common/_session-component";
import * as React from 'react';
import {MarketplaceAppBar, SettingsButton} from "../common/_appbar";
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {IListedNFT, INFT, NFT, nftAcl, nftPrivFields, nftPubFields} from "../common/_nft";
import NFTImg from "../common/user-nft-page-subComponents/_nft-Img";
import NFTAssetForm from "../common/user-nft-page-subComponents/_nft-assetForm";
import NFTPricingForm from "../common/user-nft-page-subComponents/_nft-pricingForm";
import {HTTPError} from "../common/_rpcCommon";
import {toPojo} from "@thirdact/to-pojo";
import {getUser} from "../api/auth/[...nextauth]";
import Button from "@mui/material/Button";
import {UserRoles} from "../common/_user";
import {ICryptoAccount} from "../common/_account";
import {IPOJOWallet, marketplaceGetWallet, toWalletPojo} from "../common/_wallet";

export enum WalletPageSlide {
  transactions = 'transactions',
  deposit = 'deposit',
  withdraw = 'withdraw'
}

export type WalletProps = SessionComponentProps&{
  subpage: WalletPageSlide;
  wallet: IPOJOWallet|null;
};

/**
 * Internal state for the Listing page
 */
export type WalletState = SessionComponentState&{
};


export class WalletPage extends SessionComponent<WalletProps, WalletState> {
  /**
   * Size of the nft image/thumbnail
   */
  imageSize = { width: 200 }
  state = {
  } as WalletState


  constructor(props: WalletProps) {
    super(props);
  }

  render() {
    const slides: Map<WalletPageSlide, [ string, JSX.Element ]> = new Map<WalletPageSlide,  [ string, JSX.Element ]>();

    slides.set(WalletPageSlide.deposit, ['Deposit', (
      <div>

      </div>
    )]);

    return (<div className={"page wallet"}>
      {this.errorDialog}
      {this.makeAppBar(this.props.router, (slides.get(this.props.subpage) as [ string, JSX.Element ])[0])}
      <div>
        <div className={"hero"}>
          <div className={"money"}>
            <span >{ '$'+ Number(this.props.wallet?.balance || 0).toFixed(2) }</span>
          </div>
          <div>
            Balance
          </div>
        </div>
        <div className={"main"}>
          {
            (slides.get(this.props.subpage) as [ string, JSX.Element ])[1]
          }
        </div>
      </div>
    </div>);
  }

  protected subcomponentProps(): SubcomponentPropsWithRouter {
    return {
      ...super.subcomponentProps(),
      router: this.props.router
    }
  }
}


export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await WalletPage.getSession(context);

  let [not_important, not_important2, subpage] = req.url.split('/');

  if (!session) {
    return {
      redirect: {
        destination: `/login`,
        permanent: false
      }
    }
  }

  const { user, wallet } = await marketplaceGetWallet(session);

  return {
    props: {
      session,
      subpage: subpage||null,
      wallet: wallet ? toWalletPojo(wallet) : null
    }
  }
}


export default withRouter(WalletPage);
