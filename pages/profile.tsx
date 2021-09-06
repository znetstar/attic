import SessionComponent, {SessionComponentProps, SessionComponentState} from "./common/_session-component";
import {Avatar, FormControl, TextField} from "@material-ui/core";
import {ImageFormat, ImageFormatMimeTypes} from '@etomon/encode-tools/lib/EncodeTools';

export type ProfileProps = SessionComponentProps&{

};

export type ProfileState = SessionComponentState&{

};



export class Profile extends SessionComponent<ProfileProps, ProfileState> {
  constructor(props: ProfileProps) {
    super(props);
  }

  onImageChange = async () => {

  }

  get image(): string|undefined {
    return (this.props.session?.data?.user?.image || void(0)) as string|undefined;
  }

  get imageAccept(): string {
    return [
      ImageFormatMimeTypes.get(ImageFormat.jpeg),
      ImageFormatMimeTypes.get(ImageFormat.png)
    ].join(',');
  }

  onImageChoose = async () => {
    document.querySelector('[name="file-input"]')?.click();
  }

  render() {

    return (
      <div className={"page profile"}>
        <header>
          <h1>Profile Information</h1>
        </header>
        <div>
          <form>
            <div>
              <FormControl className={'form-control'}>
                <div className={"image-wrapper"} onClick={this.onImageChoose}>
                  <input accept={this.imageAccept} type={'file'} name={"file-input"} onChange={this.onImageChange}></input>
                  <Avatar src={ this.image } />
                </div>
                <TextField required={true} value={this.props.session?.data?.user?.marketplaceUser?.email} className={'form-input'} type={"email"} variant={"filled"} name={"email"} label="Email" />
                <TextField required={true} className={'form-input'} type={"password"} variant={"filled"} name={"password"} label="Password" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField value={this.props.session?.data?.user?.marketplaceUser?.firstName} required={true} className={'form-input'} variant={"filled"} name={"first-name"} label="First Name" />
                <TextField value={this.props.session?.data?.user?.marketplaceUser?.middleName} required={false} className={'form-input'}  variant={"filled"} name={"middle-name"} label="Middle Name" />
                <TextField value={this.props.session?.data?.user?.marketplaceUser?.lastName}  required={true} className={'form-input'}  variant={"filled"} name={"last-name"} label="Last Name" />
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
