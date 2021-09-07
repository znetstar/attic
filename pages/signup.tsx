import {ClientSafeProvider, getCsrfToken, getProviders, signIn} from 'next-auth/client'
import {MarketplaceLogo} from "./common/_logo";
import {Component, Fragment, ReactNode} from "react";
import {Button, FormControl, TextField, InputLabel, Input, Icon, Snackbar} from '@material-ui/core';
import EmailIcon from '@material-ui/icons/Email';
import LoginFormControl from "./common/_login-common";
import Alert, { AlertProps } from '@material-ui/lab/Alert';
const URL = require('core-js/web/url');

import {NextRouter, withRouter} from "next/router"
import SessionComponent, {SessionComponentProps, SessionComponentState} from "./common/_session-component";
import {IUser} from "./common/_user";
import {diff, jsonPatchPathConverter} from "just-diff";
import {Buffer} from "buffer";

export async function getServerSideProps(context: any){
  const providers = await getProviders();
  const { res } = context;
  const session = await Signup.getSession(context);

  if (session) {
    res.setHeader('Location', '/profile');
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }

  return {
    props: {
      providers,
      csrfToken: await getCsrfToken(context)
    }
  }
}

enum LoginPanelSlides {
  login = 0,
  emailPassword = 1
}

export type SignupPanelProps = SessionComponentProps&{
  classes: any;
  router: NextRouter;
};

export type SignupPanelState = SessionComponentState&{
  emailPasswordForm: {
    email: string|null,
    password: string|null
  },
  errorMessage: string|null
}

const styles = {
  root: {

  }
}

export class Signup extends SessionComponent<SignupPanelProps,SignupPanelState> {
  async componentDidMount() {

  }

  constructor(props: SignupPanelProps) {
    super(props);

    this.state = {
      emailPasswordForm: {
        email: null,
        password: null
      },
      errorMessage: (this.props.router.query?.error || null) as string | null
    };
  }


  submitNewUser = async () => {
    (async () => {
      await this.apiRequest<null>(`/api/user`, {
        method: 'POST',
        body: Buffer.from(this.enc.serializeObject({
          fields: this.state.emailPasswordForm
        }))
      })
    })()
      .then(() => {
        document.location.href = '/login';
      })
      .catch(this.handleError);
  }

  render() {
    return (
      <Fragment>
        {this.errorDialog}
        <div className={"signup-panel page"}>
          <div className="email-password-form">
            <form method='post' onSubmit={() => this.submitNewUser()}>
              <div>
                <LoginFormControl
                  id={"username"}
                  type={"email"}
                  text={"Email"}
                  value={this.state.emailPasswordForm.email}
                  required={true}
                ></LoginFormControl>
              </div>
              <div>
                <LoginFormControl
                  id={"password"}
                  type={"password"}
                  text={"Password"}
                  value={this.state.emailPasswordForm.password}
                  required={true}
                ></LoginFormControl>
              </div>
              <div>
                <Button variant="contained" onClick={() => history.back()}>
                  Back
                </Button>
                <Button type={"submit"} variant="contained" onClick={this.submitNewUser} color="primary">
                  Signup
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Fragment>
    )
  }
}


export default withRouter(Signup);
