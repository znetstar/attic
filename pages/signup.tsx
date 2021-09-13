import { getCsrfToken, getProviders} from 'next-auth/client'
import {MarketplaceLogo} from "./common/_logo";
import {Fragment} from "react";
import {Button} from '@material-ui/core';
import LoginFormControl from "./common/_login-common";

import {NextRouter, withRouter} from "next/router"
import SessionComponent, {SessionComponentProps, SessionComponentState} from "./common/_session-component";

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

export type SignupPanelProps = SessionComponentProps&{
  classes: any;
  router: NextRouter;
};

export type SignupPanelState = SessionComponentState&{
  emailPasswordForm: {
    /**
     * User email
     */
    email: string|null,
    /**
     * User password
     */
    password: string|null
  },
  /**
   * Notification if fails
   */
  notifyMessage: string|null
}

/**
 * Component to handle email/password signup
 */
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
      notifyMessage: (this.props.router.query?.error || null) as string | null
    };
  }


  /**
   * Submits a request to create a new user, via the RPC
   */
  submitNewUser = async () => {
    (async () => {
      await this.rpc['marketplace:createUser'](this.state.emailPasswordForm)
        .then(() => {
          this.handleError('Create success', 'success');
          (document as any).location.href = '/login';
        })
    })()
     .catch(this.handleError);
  }

  render() {
    return (
      <Fragment>
        {this.errorDialog}

        <div className={"signup-panel page"}>
          <div>
            <MarketplaceLogo></MarketplaceLogo>
          </div>
          <div className="email-password-form">
            <form method='post' onSubmit={(e) => {
              this.submitNewUser();
              e.preventDefault();
            }}>
              <div>
                <LoginFormControl
                  id={"username"}
                  type={"email"}
                  text={"Email"}
                  value={this.state.emailPasswordForm.email}
                  required={true}
                  onChange={
                    (str) => {
                      this.state.emailPasswordForm.email = str;
                      this.forceUpdate();
                    }
                  }
                ></LoginFormControl>
              </div>
              <div>
                <LoginFormControl
                  id={"password"}
                  type={"password"}
                  text={"Password"}
                  value={this.state.emailPasswordForm.password}
                  required={true}
                  onChange={
                    (str) => {
                      this.state.emailPasswordForm.password = str;
                      this.forceUpdate();
                    }
                  }
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
