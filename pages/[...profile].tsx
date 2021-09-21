import SessionComponent, {
  AuthenticatedSubcomponentProps,
  SessionComponentProps,
  SessionComponentState
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

export type ProfileProps = SessionComponentProps&{
  marketplaceUser: IPOJOUser
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


  render() {
    return (<div className={"page profile"}>
      <MarketplaceAppBar
        {...this.subcomponentProps}
        rightSideOfAppbar={
          < SettingsButton
            onOpen={() => this.setState({ settingsOpen: true })}
            onClose={() => this.setState({ settingsOpen: false, editProfileOpen: false })}
            onProfileOpen={() => this.setState({ editProfileOpen: true })}
            open={this.state.settingsOpen}
            {...this.subcomponentProps}
          ></SettingsButton>
        }
        pageTitle={"Profile"}
      />
      <div>
        {
          !this.state.editProfileOpen ? (
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
                  <div>
                    <Typography variant="h5">{this.props.marketplaceUser.firstName} {this.props.marketplaceUser.lastName}</Typography>
                    <div><small></small></div>
                    <Button variant="contained" >
                      Follow
                    </Button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <EditProfile
              {...this.subcomponentProps as AuthenticatedSubcomponentProps}
            ></EditProfile>
          )
        }
      </div>
    </div>);
  }
}

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Profile.getSession(context);

  let id = req.url.split('/')[2];
  // If no id is provided
    if (!id) {
      res.setHeader('Location', '/profile/self');
      res.statusCode = 302;
      res.end();
      return;
    }


  let uid = session?.user?.marketplaceUser?.id;
  // If id is self but not logged in
  if (id === 'self' && !uid) {
    res.setHeader('Location', `/login`);
    res.statusCode = 302;
    res.end();
    return;
  }
  // If id is self but is logged in
  else if (id === 'self') {
    res.setHeader('Location', `/profile/${uid}`);
    res.statusCode = 302;
    res.end();
    return;
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
      session,
      marketplaceUser: pojoUser
    }
  }
}


export default Profile;
