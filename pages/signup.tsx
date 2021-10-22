import { getCsrfToken, getProviders} from 'next-auth/client'
import {MarketplaceLogo} from "./common/_logo";
import {Fragment} from "react";
import Button  from '@mui/material/Button';
import LoginFormControl from "./common/_login-common";
import Avatar from "@mui/material/Avatar";
import React, {ChangeEvent, PureComponent} from "react";
import { MarketplaceAppBar } from './common/_appbar';

import {NextRouter, withRouter} from "next/router"
import SessionComponent, {SessionComponentProps, SessionComponentState, ErrorDialog} from "./common/_session-component";
import {diff, jsonPatchPathConverter} from "just-diff";

import styles from "./../styles/signup.module.css";
import FormControl  from '@mui/material/FormControl';
import TextField  from '@mui/material/TextField';

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
      csrfToken: await getCsrfToken(context) || null
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
  notifyMessage: string|null,
  createPatch: {
    firstName: string|null;
    lastName: string|null;
    image: string|null;
  },
  confirmPwd: string|null
}

/**
 * Component to handle email/password signup
 */
export class Signup extends SessionComponent<SignupPanelProps,SignupPanelState> {
  protected inputRef = React.createRef();
  async componentDidMount() {
  }
  imageSize = { width: 125, height:125 }

  constructor(props: SignupPanelProps) {
    super(props);

    this.state = {
      emailPasswordForm: {
        email: null,
        password: null
      },
      notifyMessage: (this.props.router.query?.error || null) as string | null,
      pageTitle: 'SignUp',
      createPatch: {
        firstName: null,
        lastName: null,
        image: ''
      },
      confirmPwd: null,
    };
  }

  onImgAdd(e: ChangeEvent<any>): void {
    e.preventDefault();
    const file = Array.from(e.currentTarget.files as FileList)[0];
    if (!file) {
      return;
    }
    const fileUrl = URL.createObjectURL(file)
    this.setState(prevState => ({
      createPatch: {
        ...prevState.createPatch,
        image: fileUrl
      }
    }))
  }

  patchuser = (createPatch: object | any[]) => {
      let patches = diff({}, createPatch, jsonPatchPathConverter);

      patches = patches
        .map((f) => {
          if (f.value === '')
            return {
              ...f,
              value: null
            }
          return f;

        });

      this.rpc['marketplace:patchUser'](patches as any)
        .then((res) => {
          this.handleError('Registered. Enjoy!!!', 'success')
        })
        .catch(this.handleError)
  }


  /**
   * Submits a request to create a new user, via the RPC
   */
  submitNewUser = async () => {
    if (this.state.confirmPwd === this.state.emailPasswordForm.password && this.state.confirmPwd) {
      (async () => {
        await this.rpc['marketplace:createUser'](this.state.emailPasswordForm)
          .then((res) => {
            console.log(res)
            this.handleError('Create success', 'success');
          })
          .then((res) => 
            //call to login with provided email and pwd
            console.log('a')
          )
          .then((res) => 
            this.patchuser(this.state.createPatch)
          )
      })()
       .catch(this.handleError);
   } else {
    this.setState(prevState => ({
      emailPasswordForm: {
        ...prevState.emailPasswordForm,
        password: null
      },
      confirmPwd: null
    }))
    return <ErrorDialog notifyMessage={'Check Passwords'} onClose={() => {return}} />
   }
 
  }

  render() {
    return (
      <Fragment>
        {this.errorDialog}
        <div className={styles.signupPanel}>
          <MarketplaceAppBar pageTitle='' rightSideOfAppbar={null} rpc={this.rpc} handleError={this.handleError} enc={this.enc} errorDialog={this.errorDialog} router={this.props.router}/>
          <div className={styles.logo}>
            <MarketplaceLogo></MarketplaceLogo>
          </div>
          <div className={styles.emailPasswordForm}>
            <form method='post' className={styles.form} onSubmit={(e) => {
              this.submitNewUser();
              e.preventDefault();
            }}>

              <div className={styles.title}><h2>Register</h2></div>
              
              <div className={styles.avatarWrap}>
                <div className={styles.imgInput} onClick={() =>{(this.inputRef.current as any).click()}}>
                  <input className={styles.fileInput} ref={this.inputRef as any} type={'file'} name={"Avatar"} onChange={(e) => this.onImgAdd(e)}></input>
                  <Avatar
                    variant="rounded"
                    src={this.state.createPatch.image}
                    sx={{height: 150, width: 150}} />
                </div>
              </div>

              <div>
                <LoginFormControl
                  id={"firstname"}
                  type={"text"}
                  text={"First Name"}
                  value={this.state.createPatch.firstName}
                  required={true}
                  onChange={
                    (str) => {
                      this.state.createPatch.firstName = str;
                      this.forceUpdate();
                    }
                  }
                ></LoginFormControl>
              </div>

              <div>
                <LoginFormControl
                  id={"lastName"}
                  type={"text"}
                  text={"Last Name"}
                  value={this.state.createPatch.lastName}
                  required={true}
                  onChange={
                    (str) => {
                      this.state.createPatch.lastName = str;
                      this.forceUpdate();
                    }
                  }
                ></LoginFormControl>
              </div>
              
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
                <FormControl className={styles.formControl}>
                  <TextField
                    onChange={(e) =>
                      this.setState(prevState => ({
                        emailPasswordForm: {
                          ...prevState.emailPasswordForm,
                          password: e.target.value
                        }
                      }))
                    }
                    required={true} 
                    variant={"outlined"} 
                    placeholder={"Password"} 
                    type={"password"} 
                    id={"password"} 
                    value={this.state.emailPasswordForm.password} 
                    name={"password"}
                    InputProps={{classes: { root: styles.input},}} />
                </FormControl>
                </div>

                <div>
                  <FormControl className={styles.formControl}>
                    <TextField
                      onChange={(e) => this.setState({ confirmPwd: e.target.value })}
                      required={true} 
                      variant={"outlined"} 
                      placeholder={"Confirm Password"} 
                      type={"password"} 
                      id={"confirmPwd"} 
                      value={this.state.confirmPwd} 
                      name={"confirmPwd"}
                      InputProps={{classes: { root: styles.input},}} />
                  </FormControl>
                  </div>

              <div>
                <Button type={"submit"} variant="contained" className={styles.submit_btn}>
                  Continue
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
