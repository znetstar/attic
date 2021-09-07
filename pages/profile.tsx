import SessionComponent, {SessionComponentProps, SessionComponentState} from "./common/_session-component";
import {Avatar, Button, FormControl, Snackbar, TextField} from "@material-ui/core";
import {
  ImageFormat,
  ImageFormatMimeTypes,
  EncodeTools,
  SerializationFormatMimeTypes,
  SerializationFormat
} from '@etomon/encode-tools/lib/EncodeTools';
import {IPOJOUser, IUser} from "./common/_user";
import {Buffer} from 'buffer';
import {MakeEncoder} from "./common/_encoder";
import { IUser as AtticUser } from '@znetstar/attic-common';
import {IIdentityEntity} from "@znetstar/attic-common/lib/IIdentity";
import {JSONPatchOp} from "@thirdact/simple-mongoose-interface";
import {diff, jsonPatchPathConverter} from 'just-diff';
import {MarketplaceAvatar} from "./common/_avatar";
import Alert from "@material-ui/lab/Alert";


export type ProfileProps = SessionComponentProps&{

};

export type ProfileState = SessionComponentState&{
  userForm: IUser
  isCompleted: boolean;
  errorMessage: string|null;
};



export class Profile extends SessionComponent<ProfileProps, ProfileState> {
  imageSize = { width: 200 }
  state = {
    isCompleted: false,
    errorMessage: null,
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

  get userForm(): IUser {
    return this.state.userForm;
  }

  get atticUser(): AtticUser {
    return this.props.session?.user?.atticUser as AtticUser;
  }

  get atticIdentity(): IIdentityEntity|null {
    return (this.atticUser.identities || [])[0]||null as IIdentityEntity | null;
  }


  constructor(props: ProfileProps) {
    super(props);
  }

  componentDidMount() {
    this.updateIsCompleted();

    this.state.errorMessage = this.isCompleted ? null : 'Please fill out required fields';
  }


  get isCompleted() {
    return this.state.isCompleted;
  }

  onImageChange = async (file: File) => {
    let user = this.userForm as IUser;
    let buf = Buffer.from(await file.arrayBuffer());
    this.forceUpdate();
    this.changedImage = true;
  }

  changedImage: boolean = false;

  updateIsCompleted() {
    this.state.isCompleted = Boolean(
      this.state.userForm?.email &&
      this.state.userForm?.firstName &&
      this.state.userForm?.lastName
    );

    this.forceUpdate();
  }

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

  get fakeEmail() {
    return (
      this.atticIdentity &&
        // Make dynamic!
        this.userForm?.email?.indexOf('@profile.thirdact.digital') !== -1
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
                <TextField required={true} value={
                  this.fakeEmail ? null : this.userForm.email
                }  onChange={(e) => { (this as any).state.userForm.email = e.currentTarget.value; this.forceUpdate(); }} className={'form-input'} type={"email"} variant={"filled"} name={"email"} label="Email" />
                <TextField onChange={(e) => { (this as any).state.userForm.password = e.currentTarget.value; this.forceUpdate(); }} required={false} className={'form-input'} type={"password"} variant={"filled"} name={"password"} label="Password" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.userForm.firstName = e.currentTarget.value; this.forceUpdate(); }}  value={this.userForm.firstName} required={true} className={'form-input'} variant={"filled"} name={"first-name"} label="First Name" />
                <TextField onChange={(e) => { this.state.userForm.middleName = e.currentTarget.value; this.forceUpdate(); }}   value={this.userForm.middleName} required={false} className={'form-input'}  variant={"filled"} name={"middle-name"} label="Middle Name" />
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
