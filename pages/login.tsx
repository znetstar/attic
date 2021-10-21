import {ClientSafeProvider, getCsrfToken, getProviders, signIn} from 'next-auth/client'
import {MarketplaceLogo} from "./common/_logo";
import {Component, Fragment, ReactNode} from "react";
import Button  from '@mui/material/Button';
import EmailIcon from '@mui/icons-material/Email';
import LoginFormControl from "./common/_login-common";
const URL = require('core-js/web/url');

import {NextRouter, withRouter} from "next/router"
import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
  SubcomponentProps, SubcomponentPropsWithRouter
} from "./common/_session-component";
import {MarketplaceAppBar, SettingsButton} from "./common/_appbar";
import * as React from "react";

import styles from "./../styles/login.module.css";

/**
 * Various login provider (e.g., Google)
 */
interface AuthProviders {
  [name: string]: ClientSafeProvider
}

type ProviderType = AuthProviders|null;

export async function getServerSideProps(context: any){
  const providers = await getProviders();
  const { res, req } = context;
  const session = await Login.getSession(context);

  if (req.url.indexOf('callbackUrl=') !== -1) {
    return {
      redirect: {
        destination: (req.url.split('callbackUrl=').pop() as string).split('&').shift() as string,
        permanent: false
      }
    }
  }

  if (session) {
    return {
      redirect: {
        destination: `/profile`,
        permanent: false
      }
    }
  }

  return {
    props: {
      providers,
      csrfToken: await getCsrfToken(context)
    }
  }
}

/**
 * Slides for the login page
 */
enum LoginPanelSlides {
  login = 0,
  emailPassword = 1
}

export type LoginPanelProps = SessionComponentProps&{
  providers: ProviderType,
  csrfToken: string,
  initialSlide?: LoginPanelSlides,
  classes: any;
  router: NextRouter;
};

/**
 * Internal state for the login panel
 */
export type LoginPanelState = SessionComponentState&{
  /**
   * Current slide
   */
  slide: LoginPanelSlides,
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
 * Component to handle login
 */
export class Login extends SessionComponent<LoginPanelProps,LoginPanelState> {
  async componentDidMount() {

  }

  protected subcomponentProps(): SubcomponentPropsWithRouter {
    return {
      ...super.subcomponentProps(),
      router: this.props.router
    }
  }

  constructor(props: LoginPanelProps) {
    super(props);

    this.state = {
      slide: this.fromQueryString('email') ? LoginPanelSlides.emailPassword : (props.initialSlide || LoginPanelSlides.login),
      emailPasswordForm: {
        email: this.fromQueryString('email'),
        password: null
      },
      notifyMessage: this.fromQueryString('error'),
      pageTitle: 'Login'
    };
  }

  /**
   * All login providers (e.g., Google)
   */
  get providers(): ProviderType {
    return this.props.providers;
  }

  onLoginClick = async () => {
    fetch('/')
  }

  get emailPasswordForm() {
    return (
      <div className={styles.emailPasswordForm}>
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
            <Button type={"submit"} variant="contained" onClick={this.onLoginClick} className={styles.submit_btn}>
              Continue
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
          <Fragment key='1'>
            <div>
              <MarketplaceLogo></MarketplaceLogo>
            </div>
            <div>
              <h1>{"Let's get Started!"}</h1>
              <div>Choose a method to sign in</div>
            </div>
            <div className={styles.loginPanelButtons}>
              {this.providers ? Object.values(this.providers).map(provider => (
                <div
                  // @ts-ignore
                  provider={provider.name}
                  key={provider.name}>
                  {
                    (provider as any).id === 'credentials' ? (
                      <Button
                        color={'primary'}
                        startIcon={<EmailIcon/>}
                        onClick={() => { this.setState({ slide: LoginPanelSlides.emailPassword }) }}
                        variant="contained">Continue with {provider.name}</Button>
                    ) : (
                      <Button color={'primary'} onClick={() => signIn(provider.id)}  variant="contained">Continue with {provider.name}</Button>
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
          <Fragment key='2'>
            <div>
              <MarketplaceLogo></MarketplaceLogo>
            </div>
            <div>
              <div>Please login below</div>
            </div>
            {this.emailPasswordForm}
          </Fragment>
        )
      ]
    ])
  }

  render() {
    return (
        <div>
          {this.errorDialog}
          {this.makeAppBar(this.props.router, 'Login')}
          <div className={styles.loginPanel}>
            {
              this.slides.get(this.state.slide) || null
            }
          </div>
        </div>
    )
  }
}


export default withRouter(Login);
