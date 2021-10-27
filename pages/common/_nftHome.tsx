import { withRouter } from "next/router";
import React from "react";
import { MarketplaceAppBar } from "./_appbar";
import SessionComponent, {SessionComponentProps, SessionComponentState} from "./_session-component";

import styles from "./../../styles/nftHome.module.css";

type NftHomeProps = SessionComponentProps&{
}

type NftHomeState = SessionComponentState&{
}

export class NFTHome extends SessionComponent<NftHomeProps,NftHomeState> {

  constructor(props: NftHomeProps) {
    super(props);
  }

  render() {
    return (
      <div className={styles.nftHome_wrapper}>
        {this.errorDialog}
        <MarketplaceAppBar showBack={'none'} pageTitle='HOME' rightSideOfAppbar={null} rpc={this.rpc} handleError={this.handleError} enc={this.enc} errorDialog={this.errorDialog} router={this.props.router}/>
        <div className={styles.mainCarousel}>
          <p>Trending</p>
          <div className={styles.nftMainCarousel_wrapper}>
            <div className={styles.item}></div>
            <div className={styles.item}></div>
            <div className={styles.item}></div>
            <div className={styles.item}></div>
            <div className={styles.item}></div>
          </div>
        </div>

        <div className={styles.miniCarousel}>
          <p>Latest Activity</p>
          <div className={styles.nftMiniCarousel_wrapper}>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
            <div className={styles.itemMini}></div>
          </div>
        </div>

        <div className={styles.nftList}>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
          <div className={styles.nft}></div>
        </div>

      </div>
    )
  }
}

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await NFTHome.getSession(context);

  return {
    props: {
      session
    }
  }
}

export default withRouter(NFTHome)
