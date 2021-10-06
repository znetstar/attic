import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
  SubcomponentPropsWithRouter
} from "../common/_session-component";
import * as React from 'react';
import {ObjectId} from "mongodb";
import {withRouter} from "next/router";
import {IListedNFT, INFT, NFT, nftAcl, nftPrivFields, nftPubFields} from "../common/_nft";
import {IPOJOUser, toUserPojo, User, userAcl, userPrivFields, userPubFields, IUser} from "../common/_user";
import NFTImg from "../common/user-nft-page-subComponents/_nft-Img";
import NFTAssetForm from "../common/user-nft-page-subComponents/_nft-assetForm";
import NFTPricingForm from "../common/user-nft-page-subComponents/_nft-pricingForm";
import {toPojo} from "@thirdact/to-pojo";
import {getUser} from "../api/auth/[...nextauth]";
import Button from "@mui/material/Button";
import {UserRoles} from "../common/_user";
import EncodeTools, {BinaryEncoding, IDFormat} from "@etomon/encode-tools/lib/EncodeTools";
import {initMarketplace, TokenSupplyType, TokenType} from "../common/_token";

export type ListingProps = SessionComponentProps&{
  nftForm?: INFT,
  subpage: string|null
  canEdit: boolean;
  userList: []
};

export enum ListingStep {
  assetForm =  0,
  pricingForm = 1
}

/**
 * Internal state for the Listing page
 */
export type ListingState = SessionComponentState&{
  editListingOpen: boolean;
  settingsOpen: boolean;
  /**
   * Fields for the user nft being modified
   */
  nftForm: INFT;
  originalNftForm: INFT;
  /**
   * Is `true` when all required fields have ben satisfied
   */
  isCompleted: boolean;
  notifyMessage: string|null;
  stepNum: ListingStep;
  pageTitle: string;
  usersList: IUser[];
};


export class Listing extends SessionComponent<ListingProps, ListingState> {
  /**
   * Size of the nft image/thumbnail
   */
  imageSize = { width: 200 }
  state: ListingState = {
    editListingOpen: false,
    settingsOpen: false,
    stepNum: 0,
    isCompleted: false,
    notifyMessage: null,
    nftForm: this.props.nftForm || {nftFor:'sale'},
    originalNftForm: { ...(this.props.nftForm || {}) },
    pageTitle: 'Listing',
    usersList: []
  } as ListingState


  constructor(props: ListingProps) {
    super(props);
  }

  componentDidMount() {
    if(this.props.session.user) {
      this.getAllUsers()
    }
  }

  getAllUsers = () => {
    this.rpc['marketplace:getAllUsers']()
      .then((res) => {
        let users = [...this.state.usersList, ...res]
        this.setState({ usersList: users })
      })
      .catch(this.handleError)
  }

  /**
   * Fields for the nft form being edited
   */
  get nftForm(): INFT {
    return this.state.nftForm;
  }

  /**
   * NFT from the database
   */
  get nft(): INFT|undefined {
    return this.props.nftForm;
  }


  get canEdit(): boolean {
    return this.props.canEdit;
  }

  public get editListingOpen() {
    return this.canEdit && this.props.subpage === 'edit';
  }


  /**
   * Updates the user object on the server with the modified fields in the `userForm`
   * by creating an array of JSONPatch entries for each change, and submitting the patch
   * over rpc.
   */
  updateAssetForm = () => {
    this.setState({ stepNum: 1 })
  }

  onFormChange = (formName: Partial<INFT>, formValue: any) => {
    this.setState({ nftForm: { ...this.state.nftForm, [formName as string]: formValue } }, () => console.log('main', this.nftForm, formName))
  }

  render() {
    return (<div className={"page createNFT"}>
      {this.errorDialog}
      {this.makeAppBar(this.props.router, 'Listing')}
      <div>
        {
          this.editListingOpen ? (
            (
              <div >
                <div className={"main"}>
                  <div>
                    <NFTImg allowUpload={true} nftForm={this.state.nftForm} onNftInput={this.onFormChange} />
                  </div>
                  <div >
                    {this.state.stepNum === ListingStep.assetForm ?
                      <NFTAssetForm nftForm={this.state.nftForm} updateAssetForm={this.updateAssetForm} onFormChange={this.onFormChange}/> :
                      <NFTPricingForm originalNftForm={this.state.originalNftForm} nftForm={this.state.nftForm} onFormChange={this.onFormChange} usersList={this.state.usersList} currUser={this.props.session.user} />
                    }
                  </div>
                </div>
              </div>
            )
          ) : (
            // <EditProfile
            //   {...this.subcomponentProps() as AuthenticatedSubcomponentProps}
            // ></EditProfile>
            <div>
              <div >
                <div className={"main"}>
                  <div>
                    <NFTImg allowUpload={false} nftForm={this.state.nftForm} onNftInput={this.onFormChange} />
                  </div>
                  <div >
                    {
                      this.canEdit ? (
                        <Button variant="contained"
                                onClick={() => this.nftForm?._id && this.props.router.push(`/listing/${this.nftForm?._id}/edit`)}
                        >
                          Edit Listing
                        </Button>
                      ) : (
                        <Button variant="contained" >
                          Purchase
                        </Button>
                      )
                    }
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div>
    </div>);
  }

  protected subcomponentProps(): SubcomponentPropsWithRouter {
    return {
      ...super.subcomponentProps(),
      router: this.props.router
    }
  }
}


export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Listing.getSession(context);

  let [not_important, not_important2, id, subpage] = req.url.split('/');
  // If no id is provided
  if (!id) {
    return {
      redirect: {
        destination: `/`,
        permanent: false
      }
    }
  }

  const user = (await getUser(session))?.marketplaceUser;
  let uid = user?._id;
  // If id is new but not logged in
  if (id === 'new' && !uid) {
    return {
      redirect: {
        destination: `/login?error=Please login before creating a listing`,
        permanent: false
      }
    }
  }
  // If id is self but is logged in attempt to create a listing
  else if (id === 'new') {
    // const acl = await nftAcl({ session });

    if (/*!acl.can('marketplace:createNFT', 'NFT')*/
      !user?.roles || !user?.roles?.includes(UserRoles.nftAdmin)
    ) {
      return {
        notFound: true
      }
    }

    const { treasury } = await initMarketplace();

    const symName = EncodeTools.WithDefaults.encodeBuffer(EncodeTools.WithDefaults.uniqueId(IDFormat.uuidv1), BinaryEncoding.base32).toLowerCase().substr(0, 100);
    const nft = await NFT.create({
      userId: uid,
      symbol: symName,
      name: symName,
      treasury,
      supplyType: TokenSupplyType.finite,
      tokenType: TokenType.nft,
      sellerId: uid
    });

    return {
      redirect: {
        destination: `/listing/${nft._id.toString()}/edit`,
        permanent: false
      }
    }
  }

  let nft: INFT;

  let proj: any = {};

  for (let k of nftPubFields) {
    proj[k] = 1;
  }

  nft = (await NFT.find({ _id: new ObjectId(id) }, proj).limit(1).exec())[0];

  if (!nft) {
    return {
      notFound: true
    }
  }

  const acl = await nftAcl({ session, nft });

  for (const field in (nft as any)._doc) {
    if (!acl.can('marketplace:getNFT', "NFT", field)) {
      return {
        notFound: true
      }
    }
  }

  const nftPojo: any = toPojo(nft);

  return {
    props: {
      session,
      subpage: subpage||null,
      canEdit: acl.can('marketplace:patchNFT', nft),
      nftForm: nftPojo
    }
  }
}


export default withRouter(Listing);
