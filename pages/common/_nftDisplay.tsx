import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
} from "./_session-component";
import * as React from 'react';
import {withRouter} from "next/router";

import styles from "./../../styles/nftDisplay.module.css"


export type NFTHomeProps = SessionComponentProps&{
};

export type NFTHomeState = SessionComponentState&{
};


export class NFTHome extends SessionComponent<NFTHomeProps, NFTHomeState> {
  constructor(props: NFTHomeProps) {
    super(props);
  }

  render() {
    return (
    <div className={styles.home_wrapper}>
      {this.errorDialog}
      {this.makeAppBar(this.props.router, 'Home')}
      <div>
        <h2>Trending</h2>
        <div className={styles.carousel_wrapper}>
        </div>
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


export default withRouter(NFTHome);
