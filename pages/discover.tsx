import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
} from "./common/_session-component";
import * as React from 'react';
import {withRouter} from "next/router";
import {IListedNFT, NFT, nftAcl, nftPubFields} from "./common/_nft";
import {toPojo} from "@thirdact/to-pojo";
import {getUser} from "./api/auth/[...nextauth]";
import { MarketplaceAvatar } from "./common/_avatar";
import { TextField, InputAdornment } from "@mui/material/";
import SearchIcon from '@mui/icons-material/Search';
import { MarketplaceAppBar } from "./common/_appbar";
import {NavBar} from "./common/_footer-nav";
import Avatar from '@mui/material/Avatar';

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
    // this.nftRef = React.createRef();
    // this.nftRef.current = []
  }
  
  stringAvatar = (name: string)  => {
    return {
      sx: {
        bgcolor: '#ff2562',
        height:30, 
        width:30, 
        fontSize: '14px',
        color: 'white'
      },
      children: `${name.split(' ')[0][0]}${name.split(' ')[1][0]}`,
    };
  }

  nftSelect = (id) => {
    console.log(`/purchase/${id}`)
    this.props.router.push(`/purchase/${id}`)
  }

  profileSelect = (uid) => {
    console.log(uid)
    this.props.router.push(`/profile/${uid}`)
  }

  render() {
    const displayNft = this.props.nfts ? 
      this.props.nfts.filter(nft =>  
        nft.tags.join(' ').toLowerCase().includes(this.state.searchText) || 
        nft.name.toLowerCase().includes(this.state.searchText) || 
        nft.sellerInfo.firstName.toLowerCase().includes(this.state.searchText) || 
        nft.sellerInfo.lastName.toLowerCase().includes(this.state.searchText)) 
      : []
    return (
    <div className={styles.discoverWrap}>
      {this.errorDialog}
      <MarketplaceAppBar showBack={'none'} pageTitle='DISCOVERY' rightSideOfAppbar={null} rpc={this.rpc} handleError={this.handleError} enc={this.enc} errorDialog={this.errorDialog} router={this.props.router}/>
     
      <div className={styles.searchBar}>
        <TextField onChange={(e) => this.setState({ searchText: e.target.value.toLowerCase() })} 
                  variant={"outlined"} 
                  name={"nftSearch"}  
                  placeholder="Search"
                  sx={{width: '90%', maxWidth: '400px'}}
                  InputProps={{endAdornment: <InputAdornment position="end" sx={{color: 'black'}}><SearchIcon/></InputAdornment>, classes: { root: styles.input},}} />
      </div>

        <div className={styles.nftWrapper}>
          {displayNft ? displayNft.map((nft, idx) => {
            const sellerImg = nft.sellerInfo.image ? nft.sellerInfo.image : ''
            const sellerFirstName = nft.sellerInfo.firstName ? nft.sellerInfo.firstName : ''
            const sellerLastName = nft.sellerInfo.lastName ? nft.sellerInfo.lastName : ''
            return(
            <div className={styles.nft} key={idx}>
              <div className={styles.nftImg} onClick={() => this.nftSelect(nft._id)}>{nft.image}</div>
              <div className={styles.nftInfo}>
                <div className={styles.name} onClick={() => this.nftSelect(nft._id)}>{nft.name}</div>
                <div className={styles.owner} onClick={() => this.profileSelect(nft.sellerId)}>
                  <div className={styles.ownerImg}>
                    {sellerImg ? (
                                  <MarketplaceAvatar
                                    image={
                                      typeof(sellerImg) === 'string' ? Buffer.from(sellerImg, 'base64') : sellerImg
                                    }
                                    imageFormat={this.enc.options.imageFormat}
                                    allowUpload={false}
                                    resizeImage={{height:30, width:30}}
                                  ></MarketplaceAvatar>
                                ) : (
                                  <Avatar {...this.stringAvatar(sellerFirstName + ' ' + sellerLastName)}/>
                                )}
                  </div>
                  <div className={styles.ownerName}>{sellerFirstName && sellerLastName ? '@' + sellerFirstName + '_' + sellerLastName : '@' + sellerFirstName + sellerLastName}</div>
                </div>
              </div>
            </div>
          )}) : 'Please check later!!!'}
        </div>
      <NavBar session={this.props.session} wallet={null}/>
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


