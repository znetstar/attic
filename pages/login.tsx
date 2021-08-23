import {ClientSafeProvider, getCsrfToken, getProviders, signIn} from 'next-auth/client'
import {MarketplaceLogo} from "./common/_logo";
import {Component, Fragment, ReactNode} from "react";
import {Button, FormControl, TextField, InputLabel, Input, Icon, Snackbar} from '@material-ui/core';
import EmailIcon from '@material-ui/icons/Email';
import LoginFormControl from "./common/_login-common";
import Alert, { AlertProps } from '@material-ui/lab/Alert';
const URL = require('core-js/web/url');

import {NextRouter, withRouter} from "next/router"


interface AuthProviders {
  [name: string]: ClientSafeProvider
}

type ProviderType = AuthProviders|null;

export async function getServerSideProps(context: any){
  const providers = await getProviders()
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

export interface LoginPanelProps {
  providers: ProviderType,
  csrfToken: string,
  initialSlide?: LoginPanelSlides,
  classes: any;
  router: NextRouter;
};

export interface LoginPanelState {
  slide: LoginPanelSlides,
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

export class Login extends Component<LoginPanelProps,LoginPanelState> {
  async componentDidMount() {

  }

  constructor(props: LoginPanelProps) {
    super(props);

    this.state = {
      slide: props.initialSlide || LoginPanelSlides.login,
      emailPasswordForm: {
        email: null,
        password: null
      },
      errorMessage: (this.props.router.query?.error || null) as string | null
    };
  }

  get providers(): ProviderType {
    return this.props.providers;
  }

  onLoginClick = async () => {
    fetch('/')
  }

  get emailPasswordForm() {
    return (
      <div className="email-password-form">
        <form method='post' action='/api/auth/callback/credentials'>
          <input name='csrfToken' type='hidden' defaultValue={this.props.csrfToken}/>
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
            <Button variant="contained" onClick={() => this.setState({  slide: LoginPanelSlides.login })}>
              Back
            </Button>
            <Button type={"submit"} variant="contained" onClick={this.onLoginClick} color="primary">
              Login
            </Button>
          </div>
        </form>
      </div>
    )
  }

  get slides(): Map<LoginPanelSlides, JSX.Element> {
    return new Map<LoginPanelSlides, JSX.Element>([
      [ LoginPanelSlides.login,
        (
          <Fragment>
            <div>
              <MarketplaceLogo></MarketplaceLogo>
            </div>
            <div>
              <h1>Let's get Started!</h1>
              <div>Choose a method to sign in</div>
            </div>
            <div className={"login-panel-buttons"}>
              {this.providers ? Object.values(this.providers).map(provider => (
                <div key={provider.name}>
                  {
                    (provider as any).id === 'credentials' ? (
                      <Button startIcon={<EmailIcon/>} onClick={() => { this.setState({ slide: LoginPanelSlides.emailPassword }) }}  variant="contained">Continue with {provider.name}</Button>
                    ) : (
                      <Button onClick={() => signIn(provider.id)}  variant="contained">Continue with {provider.name}</Button>
                    )
                  }

                </div>
              )) :  null}
            </div>
          </Fragment>
        )
      ],
      [ LoginPanelSlides.emailPassword,
        (
          <Fragment>
            <div>
              <div>Choose a method to sign in</div>
            </div>
            {this.emailPasswordForm}
          </Fragment>
        )
      ]
    ])
  }

  render() {
    return (
      <Fragment>
        {this.state.errorMessage ? <Snackbar open={Boolean(this.state.errorMessage)} autoHideDuration={6000} onClose={() => this.setState({ errorMessage: null })}>
          <Alert onClose={() => this.setState({ errorMessage: null })} severity="error">
            {this.state.errorMessage}
          </Alert>
        </Snackbar> : null}
        <div className={"login-panel page"}>
          {
            this.slides.get(this.state.slide) || null
          }
        </div>
      </Fragment>
    )
  }
}
export default withRouter(Login);
