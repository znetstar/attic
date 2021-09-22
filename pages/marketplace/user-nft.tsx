import SessionComponent, {SessionComponentProps, SessionComponentState} from "./../common/_session-component";
import { IUser as AtticUser } from '@znetstar/attic-common';
import {diff, jsonPatchPathConverter} from 'just-diff';


import { INFTData } from "./../common/_ntf-collection";
import NFTImg from '../common/user-nft-page-subComponents/_nft-Img'
import CreateNFTHeader from "../common/user-nft-page-subComponents/_nft-createHeader";
import NFTAssetForm from "../common/user-nft-page-subComponents/_nft-assetForm";


export type UserNFTProps = SessionComponentProps&{

};

/**
 * Internal state for the UserNFT page
 */
export type UserNFTState = SessionComponentState&{
  /**
   * Fields for the user nft being modified
   */
  nftForm: INFTData;
  /**
   * Is `true` when all required fields have ben satisfied
   */
  isCompleted: boolean;
  notifyMessage: string|null;
  stepNum: number;
};


export class UserNFT extends SessionComponent<UserNFTProps, UserNFTState> {
  /**
   * Size of the nft image/thumbnail
   */
  imageSize = { width: 200 }
  state = {
    stepNum: 0,
    isCompleted: false,
    notifyMessage: null,
    nftForm: {}
  } as UserNFTState

  /**
   * Fields for the nft form being edited
   */
  get nftForm(): INFTData {
    return this.state.nftForm;
  }

  /**
   * to get user ID
   */
  get getUser(): AtticUser {
    return this.props.session?.user?.atticUser as AtticUser;
  }

  constructor(props: UserNFTProps) {
    super(props);
  }

  componentDidMount() {
    this.state.notifyMessage = this.state.isCompleted ? null : 'Please fill out required fields';
  }

  /**
   * Updates the user object on the server with the modified fields in the `userForm`
   * by creating an array of JSONPatch entries for each change, and submitting the patch
   * over rpc.
   */
  updateAssetForm = () => {
    // (async () => {
    //   const nftForm: INFTData = {
    //     ...this.nftForm
    //   };

    //   let patches = diff((this as any).props.session.user.marketplaceUser, nftForm, jsonPatchPathConverter);

    //   let imagePatches = patches.filter(f => f.path.substr(0, '/image'.length) === '/image');

    //   patches = patches
    //     .filter(f => f.path.substr(0, '/image'.length) !== '/image');

    //   if (this.changedImage && userForm.image) {
    //     patches.push({
    //       op: 'add',
    //       path: '/image',
    //       value: userForm.image
    //     })
    //   }

    //   await this.rpc["marketplace:patchUser"]({} as any, patches as any)
    //     .then(() => {
    //       this.handleError('Save success', 'success');
    //       this.changedImage = false;
    //     })
    //     .catch(this.handleError);
    // })()
    //   .then(() => {
    //     this.updateIsCompleted();
    //   })
    // })
    console.log('next form')
  }

  onFormChange = (formName: Partial<INFTData>, formValue: any) => {
    let { nftForm} = this.state
    nftForm[formName] = formValue
    this.forceUpdate()
    console.log('main', this.nftForm, formName)
  }

  render() {

    return (
      <div className={"page createNft"}>
        {this.errorDialog}
        {/* <CreateNFTHeader stepNum={2} /> */}
        <NFTImg allowUpload={true}/>
        <NFTAssetForm nftForm={this.state.nftForm} updateAssetForm={this.updateAssetForm} onFormChange={this.onFormChange}/>
        </div>
    );
  }
}


export async function getServerSideProps(context: any) {
  const { res } = context;
  const session = await UserNFT.getSession(context);

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


export default UserNFT;
