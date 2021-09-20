import {Component} from "react";
import SessionComponent, {SessionComponentProps, SessionComponentState} from "./../common/_session-component";
import { Button, FormControl, TextField, ToggleButton } from "@material-ui/core";
import {Buffer} from 'buffer';
import { IUser as AtticUser } from '@znetstar/attic-common';
import {IIdentityEntity} from "@znetstar/attic-common/lib/IIdentity";
import {diff, jsonPatchPathConverter} from 'just-diff';
import {MarketplaceAvatar} from "./../common/_avatar";
import {MarketplaceLogo} from "./../common/_logo";
import { INFTData } from "./../common/_ntf-collection";


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
};


export class UserNFT extends SessionComponent<UserNFTProps, UserNFTState> {
  /**
   * Size of the nft image/thumbnail
   */
  imageSize = { width: 200 }
  state = {
    isCompleted: false,
    notifyMessage: null,
    nftForm: {
      // ...this.props.session?.user?.marketplaceUser as IPOJOUser,
      // ...(
      //   this.props.session?.user?.marketplaceUser?.image ? {
      //      image: (
      //         Buffer.from(this.props.session?.user?.marketplaceUser?.image, 'base64')
      //      )
      //   } : {}
      // )
    }
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
    console.log('ooo', this)
    this.state.notifyMessage = this.state.isCompleted ? null : 'Please fill out required fields';
  }

  /**
   * Updates the user object on the server with the modified fields in the `userForm`
   * by creating an array of JSONPatch entries for each change, and submitting the patch
   * over rpc.
   */
  updateForm = () => {
    (async () => {
      const nftForm: INFTData = {
        ...this.nftForm
      };

      let patches = diff((this as any).props.session.user.marketplaceUser, nftForm, jsonPatchPathConverter);

      let imagePatches = patches.filter(f => f.path.substr(0, '/image'.length) === '/image');

      patches = patches
        .filter(f => f.path.substr(0, '/image'.length) !== '/image');

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

  })}

  render() {

    return (
      <div className={"page createNft"}>
        {this.errorDialog}
          <form onSubmit={(e) => { this.updateForm(); e.preventDefault(); }}>
            <aside>
              <header>
                THIRD ACT
              </header>
              <FormControl className={'form-control'}>
                <div className={"avatar-wrapper"}>
                  <div>
                    <MarketplaceAvatar
                      image={this.nftForm.nft_item}
                      onChange={(image) => {

                        this.state.nftForm.nft_item = image;
                        this.forceUpdate();
                      }}
                      imageFormat={this.enc.options.imageFormat}
                      resizeImage={this.imageSize}
                      allowUpload={true}
                    ></MarketplaceAvatar>
                  </div>
                </div>
              </FormControl>
           </aside>

           <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.nftForm.title = e.currentTarget.value; this.forceUpdate(); }} value={this.nftForm.title}  required={true} className={'form-input'}  variant={"filled"} name={"title"} label="Title" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.nftForm.description = e.currentTarget.value; this.forceUpdate(); }} value={this.nftForm.description}  required={false} className={'form-input'}  variant={"filled"} name={"description"} label="Description" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { this.state.nftForm.supply = Math.floor(parseInt(e.currentTarget.value)); this.forceUpdate(); }} value={this.nftForm.supply} type="number" required={true} className={'form-input'}  variant={"filled"} name={"supply"} label="Supply" />
              </FormControl>
            </div>
            <div>
            <FormControl className={'form-control'}>
                <Button style={{ width: '50%' }} type={"button"} variant="contained" color="primary">
                  Back
                </Button>
              </FormControl>
              <FormControl className={'form-control'}>
                <Button style={{ width: '50%' }} type={"submit"} variant="contained" color="primary">
                  Next
                </Button>
              </FormControl>
            </div>
          </form>
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
