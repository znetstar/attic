import SessionComponent, {SessionComponentProps, SessionComponentState} from "./common/_session-component";
import { Button, FormControl, TextField} from "@material-ui/core";
import {IPOJOUser, IUser} from "./common/_user";
import {Buffer} from 'buffer';
import { IUser as AtticUser } from '@znetstar/attic-common';
import {IIdentityEntity} from "@znetstar/attic-common/lib/IIdentity";
import {diff, jsonPatchPathConverter} from 'just-diff';
import {MarketplaceAvatar} from "./common/_avatar";


export type ProfileProps = SessionComponentProps&{

};

/**
 * Internal state for the profile page
 */
export type ProfileState = SessionComponentState&{
  /**
   * Fields for the profile being modified
   */
  userForm: IUser
  /**
   * Is `true` when all required fields have ben satisfied
   */
  isCompleted: boolean;
  notifyMessage: string|null;
};


export class Profile extends SessionComponent<ProfileProps, ProfileState> {
  /**
   * Size of the profile image
   */
  imageSize = { width: 200 }
  state = {
    isCompleted: false,
    notifyMessage: null,
    userForm: {
      ...this.props.session?.user?.marketplaceUser as IPOJOUser,
      ...(
        this.props.session?.user?.marketplaceUser?.image ? {
           image: (
              Buffer.from(this.props.session?.user?.marketplaceUser?.image, 'base64')
           )
        } : {}
      )
    }
  } as ProfileState

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


  constructor(props: ProfileProps) {
    super(props);
  }

  componentDidMount() {
    this.updateIsCompleted();

    this.state.notifyMessage = this.isCompleted ? null : 'Please fill out required fields';
  }


  /**
   * Is `true` when all required fields are complete
   */
  get isCompleted() {
    return this.state.isCompleted;
  }

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

  protected changedImage: boolean = false;

  /**
   * Updates the `isCompleted` field.
   * @protected
   */
  protected updateIsCompleted() {
    this.state.isCompleted = Boolean(
      this.state.userForm?.email &&
      this.state.userForm?.firstName &&
      this.state.userForm?.lastName
    );

    this.forceUpdate();
  }

  /**
   * Updates the user object on the server with the modified fields in the `userForm`
   * by creating an array of JSONPatch entries for each change, and submitting the patch
   * over rpc.
   */
  updateForm = () => {
    (async () => {
      const userForm: IUser = {
        ...this.userForm
      };

      let patches = diff((this as any).props.session.user.marketplaceUser, userForm, jsonPatchPathConverter);

      let imagePatches = patches.filter(f => f.path.substr(0, '/image'.length) === '/image');

      patches = patches
        .filter(f => f.path.substr(0, '/image'.length) !== '/image');

      if (this.changedImage && userForm.image) {
        patches.push({
          op: 'replace',
          path: '/image',
          value: userForm.image
        })
      }

      await this.rpc["db:User:patch"]({} as any, patches as any)
        .then(() => {
          this.handleError('Save success', 'success');
          this.changedImage = false;
        })
        .catch(this.handleError);
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
      <div className={"page profile"}>
        {this.errorDialog}
        <header>
          <h1>Profile Information</h1>
        </header>
        <div>
          <form onSubmit={(e) => { this.updateForm(); e.preventDefault(); }}>
            <div>
              <FormControl className={'form-control'}>
                <MarketplaceAvatar
                  image={this.userForm.image}
                  onChange={(image) => {

                    this.changedImage = true;
                    this.state.userForm.image = image;
                    this.forceUpdate();
                  }}
                  imageFormat={this.enc.options.imageFormat}
                  resizeImage={this.imageSize}
                  allowUpload={true}
                ></MarketplaceAvatar>
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField required={true} value={
                  this.fakeEmail ? null : this.userForm.email
                }  onChange={(e) => { (this as any).state.userForm.email = e.currentTarget.value; this.forceUpdate(); }} className={'form-input'} type={"email"} variant={"filled"} name={"email"} label="Email" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { (this as any).state.userForm.password = e.currentTarget.value; this.forceUpdate(); }} required={false} className={'form-input'} type={"password"} variant={"filled"} name={"password"} label="Password" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.userForm.firstName = e.currentTarget.value; this.forceUpdate(); }}  value={this.userForm.firstName} required={true} className={'form-input'} variant={"filled"} name={"first-name"} label="First Name" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.userForm.middleName = e.currentTarget.value; this.forceUpdate(); }}   value={this.userForm.middleName} required={false} className={'form-input'}  variant={"filled"} name={"middle-name"} label="Middle Name" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.userForm.lastName = e.currentTarget.value; this.forceUpdate(); }} value={this.userForm.lastName}  required={true} className={'form-input'}  variant={"filled"} name={"last-name"} label="Last Name" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <Button type={"submit"} variant="contained" onClick={() => history.back()} color="primary">
                  Back
                </Button>
                <Button type={"submit"} variant="contained" color="primary">
                  Update
                </Button>
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
  if (!session.token?.userId) {
    res.setHeader('Location', '/signup');
    res.statusCode = 302;
    res.end();
    return { props: {} };
  }
  return {
    props: {
      session
    }
  }
}


export default Profile;
