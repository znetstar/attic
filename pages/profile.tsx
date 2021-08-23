import {Component} from "react";
import {getSession, useSession} from "next-auth/client";
import SessionComponent, {SessionComponentProps, SessionComponentState, withSession} from "./common/_session-component";
import {User} from "./common/_user";
import {FormControl, TextField} from "@material-ui/core";

export type ProfileProps = SessionComponentProps&{

};

export type ProfileState = SessionComponentState&{

};


export class Profile extends SessionComponent<ProfileProps, ProfileState> {
  constructor(props: ProfileProps) {
    super(props);
  }

  render() {

    return (
      <div className={"page"}>
        <header>
          <h1>Profile Information</h1>
        </header>
        <div>
          <form>
            <div>
              <FormControl className={'form-control'}>
                <TextField required={true} className={'form-input'} variant={"filled"} name={"first-name"} label="First Name" />
                <TextField required={true} className={'form-input'}  variant={"filled"} name={"last-name"} label="Last Name" />
              </FormControl>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export async function getServerSideProps(context: any) {
  const { res } = context;
  const session = await Profile.getSession(context);

  if (!session) {
    res.setHeader('Location', '/login');
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }

  const user = await User.findOne({
    atticUserId: session.token.atticUserId
  }).exec();

  if (!user) {
    if (!session) {
      res.setHeader('Location', '/login');
      res.statusCode = 302;
      res.end();
      return { props: {} };
    }
  }

  return {
    props: {
      session,
      user
    }
  }
}

export default Profile;
