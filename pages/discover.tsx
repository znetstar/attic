import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
} from "./common/_session-component";
import * as React from 'react';
import {withRouter} from "next/router";
import {IListedNFT, NFT, nftAcl, nftPubFields} from "./common/_nft";
import {toPojo} from "@thirdact/to-pojo";
import {getUser} from "./api/auth/[...nextauth]";
import { TextField, InputAdornment } from "@mui/material/";
import SearchIcon from '@mui/icons-material/Search';

import styles from './../styles/discover.module.css';

type DiscProps = SessionComponentProps&{
  nfts: IListedNFT[]
};

type DiscState = SessionComponentState&{
  searchText: string;
};


export class Discover extends SessionComponent<DiscProps, DiscState> {
  state = {
    searchText: ''
  } as DiscState


  constructor(props: DiscProps) {
    super(props);
  }

  render() {
    const displayNft = this.props.nfts ? this.props.nfts.filter(nft =>  nft.tags.join(' ').toLowerCase().includes(this.state.searchText) || nft.name.toLowerCase().includes(this.state.searchText)) : []
    return (
    <div className={"page createNFT"}>
      {this.errorDialog}
      {this.makeAppBar(this.props.router, 'Discover')}
      <TextField onChange={(e) => this.setState({ searchText: e.target.value.toLowerCase() })} 
                 variant={"outlined"} 
                 name={"priceStart"}  
                 placeholder="Search"
                 InputProps={{endAdornment: <InputAdornment position="end"><SearchIcon/></InputAdornment>, classes: { root: styles.input},}} />
      
        <div className={styles.nftWrapper}>
          {displayNft ? displayNft.map(nft => (
            <div className={styles.nft} key={nft._id}>
              <div className={styles.nftImg}>{nft.image}</div>
              <div className={styles.nftInfo}>
                <div className={styles.name}>{nft.name}</div>
                <div className={styles.owner}>
                  <div className={styles.ownerImg}></div>
                  <div className={styles.ownerName}></div>
                </div>
              </div>
            </div>
          )) : 'Please check later!!!'}
        </div>

    </div>);
  }
}

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Discover.getSession(context);

  const user = (await getUser(session))?.marketplaceUser;
 
  let nft: IListedNFT[];

  let proj: any = {};

  nft = (await NFT.find({}, {}).exec());

  const nftPojo: any[] = nft.map(n => toPojo(n));

  return {
    props: {
      session,
      nfts: nftPojo
    }
  }
}


export default withRouter(Discover);
