import { Component } from 'react';
import {
  AuthenticatedSubcomponentProps,
  SubcomponentProps
} from "./_session-component";
import {IPOJOUser, IUser} from "./_user";
import {Buffer} from "buffer";
import {ProfileState} from "../[...profile]";
import {IIdentityEntity} from "@znetstar/attic-common/lib/IIdentity";
import {IUser as AtticUser} from "@znetstar/attic-common";
import {diff, jsonPatchPathConverter} from "just-diff";
import {MarketplaceSession} from "../api/auth/[...nextauth]";
import {MarketplaceAPI} from "./_rpcCommon";
import {MarketplaceLogo} from "./_logo";
import Button  from '@mui/material/Button';
import FormControl  from '@mui/material/FormControl';
import TextField  from '@mui/material/TextField';
import {MarketplaceAvatar} from "./_avatar";
import {IEncodeTools} from "@etomon/encode-tools";

export type EditProfileProps = AuthenticatedSubcomponentProps&{
  marketplaceUser: IUser;
  userImagesPublicPhotoUrl: string;
};

/**
 * Internal state for the profile page
 */
export type EditProfileState = {
  /**
   * Fields for the profile being modified
   */
  userForm: IPOJOUser
  /**
   * Is `true` when all required fields have ben satisfied
   */
  isCompleted: boolean;
  notifyMessage: string|null;
  test:  number;
};



export class EditProfile extends Component<EditProfileProps, EditProfileState> {
  /**
   * Size of the profile image
   */
  imageSize = { width: 125, height:125 }
  state = {
    isCompleted: false,
    notifyMessage: null,
    userForm: {
      middleName: null,
      email:  null,
      password: null,
      ...this.props.session?.user?.marketplaceUser as IPOJOUser,
      ...(
        this.props.session?.user?.marketplaceUser?.image ? { image: this.props.session?.user?.marketplaceUser?.image } : {}
      )
    },
    test: 0
  } as EditProfileState;


  /**
   * Fields for the user being edited
   */
  get userForm(): IUser {
    return this.state.userForm;
  }

  /**
   * Fields for the attic user being edited
   */
  get atticUser(): AtticUser {
    return this.props.session?.user?.atticUser as AtticUser;
  }


  /**
   * The Attic `IdentityEntity` of the user logged in.
   * This object contains provider specific info like, for example,
   * the user's GMail address if the user logged in  with Google.
   */
  get atticIdentity(): IIdentityEntity|null {
    return (this.atticUser.identities || [])[0]||null as IIdentityEntity | null;
  }

  componentDidMount() {
    this.updateIsCompleted();

    this.setState({ notifyMessage: this.isCompleted ? null : 'Please fill out required fields' });
  }


  /**
   * Is `true` when all required fields are complete
   */
  get isCompleted() {
    return this.state.isCompleted;
  }

  protected changedImage: boolean = false;



  /**
   * Is called when the profile image is changed
   * @param file
   */
  onImageChange = async (file: File) => {
    let user = this.userForm as IUser;
    let buf = Buffer.from(await file.arrayBuffer());
    this.forceUpdate();
    this.changedImage = true;
  }

  /**
   * Updates the `isCompleted` field.
   * @protected
   */
  protected updateIsCompleted() {
    this.setState({
      isCompleted: Boolean(
        this.state.userForm?.email &&
        this.state.userForm?.firstName &&
        this.state.userForm?.lastName
      )
    });
  }

  /**
   * Updates the user object on the server with the modified fields in the `userForm`
   * by creating an array of JSONPatch entries for each change, and submitting the patch
   * over rpc.
   */
  updateForm = () => {
    (async () => {
      const userForm: IPOJOUser = {
        ...this.userForm
      };

      let patches = diff((this as any).props.session.user.marketplaceUser, userForm, jsonPatchPathConverter);

      let imagePatches = patches.filter(f => f.path.substr(0, '/image'.length) === '/image');

      patches = patches
        .filter(f => f.path.substr(0, '/image'.length) !== '/image')
        .map((f) => {
          if (f.value === '')
            return {
              ...f,
              value: null
            }
          return f;

        });

      if (this.changedImage && userForm.image) {
        const bufImage: string = userForm.image;
        if (bufImage.substr(0,5) === 'data:') {
          const b64 = bufImage.split(';base64,').pop() as string;
          patches.push({
            op: 'add',
            path: '/image',
            value: Buffer.from(b64, 'base64')
          })
        }

      }

      await this.props.rpc["marketplace:patchUser"]({} as any, patches as any)
        .then(() => {
          this.props.handleError('Save success', 'success');
          this.changedImage = false;
        })
        .catch((err)=>this.props.handleError(err));
    })()
      .then(() => {
        this.updateIsCompleted();
      })

  }


  /**
   * Is `true` if the user logged in using a social provider, like Google
   */
  get fakeEmail() {
    return (
      this.atticIdentity &&
      // Make dynamic!
      this.userForm?.email?.indexOf('@social') !== -1
    );
  }

  render() {
    return (
      <div className={"edit-profile"}>
        {this.props.errorDialog}
        <header>
          <div>Please fill out the information below</div>
        </header>
        <div>
          <form onSubmit={(e) => { this.updateForm(); e.preventDefault(); }}>
            <div>
              <FormControl className={'form-control'}>
                <div className={"avatar-wrapper"}>
                  <div>
                    <MarketplaceAvatar
                      image={this.userForm.image}
                      onChange={(image) => {

                        this.changedImage = true;
                        this.setState({
                          userForm: {
                            ...this.state.userForm,
                            image
                          }
                        })
                      }}
                      imageFormat={this.props.enc.options.imageFormat}
                      resizeImage={this.imageSize}
                      allowUpload={true}
                      userImagesPublicPhotoUrl={this.props.userImagesPublicPhotoUrl}
                    ></MarketplaceAvatar>
                  </div>
                  <div>
                    <small>Add image (optional)</small>
                  </div>
                </div>
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField required={false} value={
                  this.fakeEmail ? null : this.userForm.email
                }  onChange={(e) => { (this as any).state.userForm.email = e.currentTarget.value; this.forceUpdate(); }} className={'form-input'} type={"email"}  variant={"filled"} name={"email"} label="Email" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { (this as any).state.userForm.password = e.currentTarget.value; this.forceUpdate(); }} required={false} className={'form-input'} type={"password"} variant={"filled"} name={"password"} label="Password" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => {
                  this.setState({
                    userForm: {
                      ...this.state.userForm,
                      firstName: e.currentTarget.value
                    }
                  })
                }}  value={this.userForm.firstName} required={true} className={'form-input'} variant={"filled"} name={"first-name"} label="First Name" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField
                  onChange={(e) => {
                    this.setState({
                      userForm: {
                        ...this.state.userForm,
                        middleName: e.currentTarget.value
                      }
                    })
                  }}
                  value={this.userForm.middleName} required={false} className={'form-input'}  variant={"filled"} name={"middle-name"} label="Middle Name" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField
                  onChange={(e) => {
                    this.setState({
                      userForm: {
                        ...this.state.userForm,
                        lastName: e.currentTarget.value
                      }
                    })
                  }}
                  value={this.userForm.lastName}  required={true} className={'form-input'}  variant={"filled"} name={"last-name"} label="Last Name" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                {/*<Button variant="contained" onClick={() => history.back()} color="primary">*/}
                {/*  Back*/}
                {/*</Button>*/}
                <Button style={{ width: '100%' }} type={"submit"} variant="contained" color="primary">
                  Continue
                </Button>
              </FormControl>
            </div>
          </form>
        </div>
      </div>
    );
  }

}
export default EditProfile;
