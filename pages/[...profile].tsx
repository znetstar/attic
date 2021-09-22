import SessionComponent, {
  AuthenticatedSubcomponentProps,
  SessionComponentProps,
  SessionComponentState, SubcomponentProps, SubcomponentPropsWithRouter
} from "./common/_session-component";
import * as React from 'react';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import {MarketplaceAppBar, SettingsButton} from "./common/_appbar";
import CloseIcon from '@mui/icons-material/Close';
import EditProfile from "./common/_edit-profile";
import {IPOJOUser, toUserPojo, User, userAcl, userPrivFields, userPubFields} from "./common/_user";
import {MarketplaceAvatar} from "./common/_avatar";
import Button from "@mui/material/Button";
import {ObjectId} from "mongodb";
import {NextRouter, withRouter} from "next/router";

export type ProfileProps = SessionComponentProps&{
  marketplaceUser: IPOJOUser,
  subpage: string|null
};

/**
 * Internal state for the profile page
 */
export type ProfileState = SessionComponentState&{
  editProfileOpen: boolean;
  settingsOpen: boolean;
};


export class Profile extends SessionComponent<ProfileProps, ProfileState> {
  state = {
    editProfileOpen:  false,
    settingsOpen: false
  } as ProfileState


  constructor(props: ProfileProps) {
    super(props);
  }


  get isSelf(): boolean { return this.props.session && this.props.marketplaceUser._id === this.props.session?.user?.marketplaceUser?._id }

  public get editProfileOpen() {
    return this.isSelf && this.props.subpage;
  }

  render() {
    return (<div className={"page profile"}>
      <MarketplaceAppBar
        {...this.subcomponentProps()}
        rightSideOfAppbar={
          < SettingsButton
            onOpen={() => this.setState({ settingsOpen: true })}
            onClose={() => this.setState({ settingsOpen: false })}
            onProfileOpen={() => this.setState({ editProfileOpen: true })}
            open={this.state.settingsOpen}
            {...this.subcomponentProps()}
          ></SettingsButton>
        }
        pageTitle={"Profile"}
      />
      <div>
        {
          !this.editProfileOpen ? (
            (
              <div >
                <div className={"main"}>
                  <div>
                    <MarketplaceAvatar
                      image={this.props.marketplaceUser.image}
                      imageFormat={this.enc.options.imageFormat}
                      allowUpload={false}
                    ></MarketplaceAvatar>
                  </div>
                  <div className={"avatar-box"}>
                    <Typography variant="h5">{this.props.marketplaceUser.firstName} {this.props.marketplaceUser.lastName}</Typography>
                    { this.props.marketplaceUser.handle ? <div><small>{this.props.marketplaceUser.handle}</small></div> : null }
                    {
                      this.isSelf ? (
                        <Button variant="contained"
                                onClick={() => this.props.router.push(`/profile/self/edit`)}
                        >
                          Edit Profile
                        </Button>
                      ) : (
                        <Button variant="contained" >
                          Follow
                        </Button>
                      )
                    }
                    <div className={"following-bar"}>
                      { typeof(this.props.marketplaceUser.following) === 'number' ? <span><small>Followers {this.props.marketplaceUser.following.toLocaleString()}</small></span> : null }
                      { typeof(this.props.marketplaceUser.followers) === 'number' ? <span><small>Following {this.props.marketplaceUser.followers.toLocaleString()}</small></span> : null }
                    </div>
                    {this.props.marketplaceUser.bio ? <p className={"bio-box"}>{this.props.marketplaceUser.bio}</p> : null }
                  </div>
                </div>
              </div>
            )
          ) : (
            <EditProfile
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

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Profile.getSession(context);

  let [not_important, not_important2, id, subpage] = req.url.split('/');
  // If no id is provided
    if (!id) {
      res.setHeader('Location', '/profile/self');
      res.statusCode = 302;
      res.end();
      return {
        props: {
        }
      }
    }


  let uid =   session?.user?.marketplaceUser?._id;
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

  let user = session?.user?.marketplaceUser;
  let pojoUser: IPOJOUser;

  const fields = session && uid === session?.user?.marketplaceUser?._id.toString() ? userPrivFields : userPubFields;
  const proj: any = {};


  for (const field of (
    fields
  )) {
    proj[field] = 1;
  }

  if (uid)
    user = (await User.find({ _id: new ObjectId(uid) }, proj).limit(1).exec())[0];

  if (!user) {
    return {
      notFound: true
    }
  }

  const acl = userAcl(user, session);

  for (const field of (
    fields
  )) {
    if (!acl.can('marketplace:getUser', user, field)) {
      return {
        notFound: true
      }
    }
  }


  pojoUser = toUserPojo(user);

  return {
    props: {
      subpage: subpage || null,
      session,
      marketplaceUser: pojoUser
    }
  }
}


export default withRouter(Profile);
