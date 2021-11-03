import SessionComponent, {
  AuthenticatedSubcomponentProps,
  SessionComponentProps,
  SessionComponentState, SubcomponentPropsWithRouter
} from "../common/_session-component";
import * as React from 'react';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import {MarketplaceAppBar, SettingsButton} from "../common/_appbar";
import EditProfile from "../common/_edit-profile";
import {IPOJOUser, IUser, toUserPojo, User, userAcl, userPrivFields, userPubFields} from "../common/_user";
import {MarketplaceAvatar} from "../common/_avatar";
import Button from "@mui/material/Button";
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {getUser} from "../api/auth/[...nextauth]";
import {IListedNFT, INFT, toListedNFT} from "../common/_nft";
import {TokenType} from "../common/_token";
import NFTItemList from "../common/_nft-item-list";
import {nftImg} from "./../common/user-nft-page-subComponents/_nft-Img";

import styles from "../../styles/profile.module.css";
import {NavBar} from "../common/_footer-nav";

export type ProfileProps = SessionComponentProps&{
  marketplaceUser: IPOJOUser,
  subpage: string|null,
  collections: IListedNFT[];
  listings: IListedNFT[];
  userImagesPublicPhotoUrl: string;
};

/**
 * Internal state for the profile page
 */
export type ProfileState = SessionComponentState&{
  editProfileOpen: boolean;
  settingsOpen: boolean;
  currentTab: number;
  nftCollections: INFT;
};


export class Profile extends SessionComponent<ProfileProps, ProfileState> {
  state = {
    editProfileOpen:  false,
    settingsOpen: false,
    pageTitle: 'Profile',
    currentTab: 0
  } as ProfileState

  constructor(props: ProfileProps) {
    super(props);
  }

  get isSelf(): boolean { return this.props.session && this.props.marketplaceUser._id === this.props.session?.user?.marketplaceUser?._id }

  public get editProfileOpen() {
    return this.isSelf && this.props.subpage === 'edit';
  }

  render() {
    return (<div className={styles.profile}>
      {this.errorDialog}
      <MarketplaceAppBar showBack={'none'} pageTitle={this.props.marketplaceUser.firstName + ' ' + (this.props.marketplaceUser.middleName ? this.props.marketplaceUser.middleName : '') + ' ' + this.props.marketplaceUser.lastName} rightSideOfAppbar={null} rpc={this.rpc} handleError={this.handleError} enc={this.enc} errorDialog={this.errorDialog} router={this.props.router}/>
      <div>
        {
          !this.editProfileOpen ? (
            (
              <div >
                <div className={styles.profile_wrapper}>
                  <div className={styles.avatar}>
                    <MarketplaceAvatar
                      image={
                        typeof(this.props.marketplaceUser.image) === 'string' ? Buffer.from(this.props.marketplaceUser.image, 'base64') : this.props.marketplaceUser.image
                      }
                      userId={this.props.marketplaceUser._id}
                      userImagesPublicPhotoUrl={this.props.userImagesPublicPhotoUrl}
                      imageFormat={this.enc.options.imageFormat}
                      allowUpload={false}
                      resizeImage={{width:125*4, height:125*4}}
                      size={{width:125*1, height:125*1}}
                    ></MarketplaceAvatar>
                  </div>
                  <div className={styles.profileInfo}>
                    <div className={styles.name}>{this.props.marketplaceUser.firstName} {this.props.marketplaceUser.lastName}</div>
                    { this.props.marketplaceUser.handle ? <div><small>{this.props.marketplaceUser.handle}</small></div> : null }
                    {
                      this.isSelf ? (
                        <Button variant="contained"
                                onClick={() => this.props.router.push(`/profile/self/edit`)}
                                className={styles.edit}
                        >
                          Edit Profile
                        </Button>
                      ) : (
                        ''
                        /* For Follow Button
                        / <Button variant="contained" >
                        /   Follow
                        / </Button>
                        */
                      )
                    }
                    {/* <div className={styles.followWrap}>
                      { typeof(this.props.marketplaceUser.following) === 'number' ? <span><small>Followers {this.props.marketplaceUser.following.toLocaleString()}</small></span> : null }
                      { typeof(this.props.marketplaceUser.followers) === 'number' ? <span><small>Following {this.props.marketplaceUser.followers.toLocaleString()}</small></span> : null }
                    </div> */}
                    {this.props.marketplaceUser.bio ? <p className={"bio-box"}>{this.props.marketplaceUser.bio}</p> : null }
                  </div>
                </div>
                <div>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider', background: 'white', color: 'black' }}>
                      <Tabs value={this.state.currentTab} 
                            onChange={(e, newValue) => { this.setState({ currentTab: Number(newValue) }) }} 
                            aria-label="My NFTs"
                            variant="fullWidth"
                            indicatorColor="secondary"
                            textColor="inherit">
                        <Tab value={0} label="LISTINGS" />
                        <Tab value={1} label="COLLECTION" />
                      </Tabs>
                    </Box>
                    <div role="tabpanel" hidden={this.state.currentTab !== 0}>
                      <NFTItemList
                        {...this.subcomponentProps()}
                        rpc={this.rpc}
                        nfts={this.props.collections}
                        clickable={true}
                        query={{ sellerId: this.props.marketplaceUser.id }}
                      ></NFTItemList>
                    </div>
                    <div hidden={this.state.currentTab !== 1}>
                      <NFTItemList
                        {...this.subcomponentProps()}
                        rpc={this.rpc}
                        nfts={this.props.listings}
                        clickable={true}
                      ></NFTItemList>
                    </div>
                  </Box>
                </div>
                <NavBar session={this.props.session} wallet={null}/>
              </div>
            )
          ) : (
            <EditProfile
                marketplaceUser={this.props.marketplaceUser}
                userImagesPublicPhotoUrl={this.props.userImagesPublicPhotoUrl}
              {...this.subcomponentProps() as AuthenticatedSubcomponentProps}
            ></EditProfile>
          )
        }
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
export type AggDelta = { user: IUser, listings: INFT[], collections: INFT[] };

export async function getServerSideProps(context: any) {
  const {   res, req } = context;
  const session = await Profile.getSession(context);
  let delta: AggDelta|undefined;

  let [ not_important, not_important2, id, subpage] = req.url.split('/');
  // If no id is provided
  if (!id) {
    return {
      redirect: {
        destination: `/profile/self`,
        permanent: false
      }
    }
  }

  let uid =  session && (await getUser(session))?.marketplaceUser?._id || null;
  // If id is self but not logged in
  if (id === 'self' && !uid) {
    return {
      redirect: {
        destination: `/login`,
        permanent: false
      }
    }
  }
  // If id is self but is logged in
  else if (id === 'self') {
    return {
      redirect: {
        destination: `/profile/${uid}${ subpage ? '/'+subpage : '' }`,
        permanent: false
      }
    }
  }
  else uid = id;

  let user: IUser = session?.user?.marketplaceUser;
  let pojoUser: IPOJOUser;



  const fields = session && uid === session?.user?.marketplaceUser?._id.toString() ? userPrivFields : userPubFields;
  const proj: any = {};


  for (const field of (
    fields
  )) {
    proj[field] = 1;
  }

  if (uid) {
    const agg = User.aggregate([
      {
        $match: {
          _id: new ObjectId(uid)
        }
      },
      {
        $limit: 1
      },
      {
        $replaceRoot: {
          newRoot: {
            user: '$$ROOT'
          }
        }
      },
      {
        $lookup: {
          from: 'tokens',
          as: 'tokens',
          let: {
            userId: '$user._id'
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $or: [
                        {
                          $eq: [
                            '$sellerInfo.id',
                            '$$userId'
                          ]
                        },
                        {
                          $eq: [
                            '$userId',
                            '$$userId'
                          ]
                        }
                      ]
                    },
                    {
                      $eq: [
                        '$tokenType',
                        TokenType.nft
                      ]
                    }
                  ]
                }
              }
            }
          ]
        }
      },
      {
        $project: {
          user: 1,
          collections: {
            $filter: {
              input: '$tokens',
              as: 'token',
              cond:                         {
                $eq: [
                  '$$token.userId',
                  '$user._id'
                ]
              }
            }
          },
          listings: {
            $filter: {
              input: '$tokens',
              as: 'token',
              cond:  {
                $eq: [
                  '$$token.sellerInfo.id',
                  '$user._id'
                ]
              }
            }
          }
        }
      }
    ]);
    delta = (await agg.exec() || [])[0] as AggDelta;
    user = delta.user;
  }

  if (!user) {
    return {
      notFound: true
    }
  }

  const acl = userAcl(user, session);

  for (const field of (
    fields
  )) {
    if (!acl.can('marketplace:getUser', 'User', field)) {
      return {
        notFound: true
      }
    }
  }

  pojoUser = toUserPojo(user);

  return {
    props: {
      collections: delta ? delta.collections.map((c: INFT) => toListedNFT(c)) : [],
      listings: delta ? delta.listings.map((c: INFT) => toListedNFT(c)) : [],
      subpage: subpage || null,
      session,
      marketplaceUser: pojoUser,
      userImagesPublicPhotoUrl: process.env.USER_IMAGES_PUBLIC_URI
    }
  }
}


export default withRouter(Profile);
