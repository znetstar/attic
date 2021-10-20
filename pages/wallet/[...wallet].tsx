import SessionComponent, {
  SessionComponentProps,
  SessionComponentState, SubcomponentPropsWithRouter
} from "../common/_session-component";
import * as React from 'react';
import {MarketplaceAppBar, SettingsButton} from "../common/_appbar";
import {ObjectId} from "mongodb";
import CircularProgress from '@mui/material/CircularProgress';
import {withRouter} from "next/router";
import {IListedNFT, INFT, NFT, nftAcl, nftPrivFields, nftPubFields} from "../common/_nft";
import NFTImg from "../common/user-nft-page-subComponents/_nft-Img";
import NFTAssetForm from "../common/user-nft-page-subComponents/_nft-assetForm";
import NFTPricingForm from "../common/user-nft-page-subComponents/_nft-pricingForm";
import {HTTPError} from "../common/_rpcCommon";
import {toPojo} from "@thirdact/to-pojo";
import {getUser, MarketplaceSession} from "../api/auth/[...nextauth]";
import Button from "@mui/material/Button";
import {UserRoles} from "../common/_user";
import {ICryptoAccount} from "../common/_account";
import {IPOJOWallet, marketplaceGetWallet, toWalletPojo} from "../common/_wallet";
import {loadStripe, Stripe} from "@stripe/stripe-js";
import {CardElement, Elements, ElementsConsumer} from '@stripe/react-stripe-js';
import {OutlinedInput, Paper} from "@mui/material";
import {signIn} from "next-auth/client";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import {InputAdornment} from "@mui/material/";

export enum WalletPageSlide {
  transactions = 'transactions',
  deposit = 'deposit',
  withdraw = 'withdraw'
}

export type WalletProps = SessionComponentProps&{
  subpage: WalletPageSlide;
  wallet: IPOJOWallet|null;
  stripePublicKey: string;
};

/**
 * Internal state for the Listing page
 */
export type WalletState = SessionComponentState&{
  depositAmount?: number;
  loading?: boolean;
  wallet: IPOJOWallet|null;
};


class CheckoutForm extends React.Component<{ stripe: Stripe, elements: any }> {
  handleSubmit = async (event: any) => {
    // Block native form submission.
    event.preventDefault();

    const {stripe, elements} = this.props;

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Make sure to disable
      // form submission until Stripe.js has loaded.
      return;
    }

    // Get a reference to a mounted CardElement. Elements knows how
    // to find your CardElement because there can only ever be one of
    // each type of element.
    const cardElement = elements.getElement(CardElement);

    const {error, paymentMethod} = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      console.log('[error]', error);
    } else {
      console.log('[PaymentMethod]', paymentMethod);
    }
  };

  render() {
    const {stripe} = this.props;
    return (
      <form onSubmit={this.handleSubmit}>
        <CardElement />
        <button type="submit" disabled={!stripe}>
          Pay
        </button>
      </form>
    );
  }
}

export class WalletPage extends SessionComponent<WalletProps, WalletState> {
  /**
   * Size of the nft image/thumbnail
   */
  imageSize = { width: 200 }
  state = {
    depositAmount: 0,
    wallet: this.props.wallet
  } as WalletState

  stripe: Stripe|null = null;

  constructor(props: WalletProps) {
    super(props);
  }

  async componentDidMount() {
    this.stripe = await loadStripe(this.props.stripePublicKey);

    this.forceUpdate();

    await this.loadBalance();
    return super.componentDidMount?.();
  }

  loadBalance = async () => {
    const wallet = await this.rpc['marketplace:getWallet']();

    this.setState({ wallet });
  }


  doTransfer = (elements: any, stripe: Stripe) => {
    return async (e: any) => {
      e.preventDefault();

      if (!this.state.depositAmount || this.state.depositAmount <= 0)
        return;

      this.setState({ loading: true })

      let Err: any;
      try {
        const clientSecret = await this.rpc['marketplace:beginBuyLegalTender'](this.state.depositAmount as string|number);
        const cardElement = elements.getElement(CardElement);

        await this.stripe?.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement
          }
        });

        await new Promise<void>((resolve, reject) => {
          setTimeout(async () => {
            try {
              await this.loadBalance();
              resolve();
            }
            catch (err) {
              reject(err);
            }
          }, 10e3);
        });
      } catch (err: any) {
        console.log(err);
        Err = err;
      } finally {
        this.setState({ loading: false });
        if (Err) {
          this.handleError(Err.message, 'error');
          throw Err;
        }
        else {
          this.handleError('Payment success', 'success');
          this.props.router.back()
        }
      }
    }
  }

  render() {
    const slides: Map<WalletPageSlide, [ string, JSX.Element ]> = new Map<WalletPageSlide,  [ string, JSX.Element ]>();

    slides.set(WalletPageSlide.deposit, ['Deposit', this.stripe  ? (
      <div className={"paper-wrapper"}>
        <Elements stripe={this.stripe}>
        <Paper elevation={1}
          color={'primary'}
        >
          <div>
            <div className={"transfer-title"}>Enter Amount to Transfer</div>
            <FormControl className={'form-control login-form-control'}>
              <OutlinedInput
                type={"number"}
                inputProps={{ min: 0 }}
                step={ 'any' }
                startAdornment={<InputAdornment position="start">$</InputAdornment>}
                label="Amount"
                value={this.state.depositAmount ? Number(this.state.depositAmount) : ''}
                onChange={(e) => {
                  let cv = e.currentTarget.value;

                  if (!Number.isNaN(Number(cv))) {
                    let numCv = Number(cv);
                    numCv = Math.round(numCv*100)/100;

                    this.setState({ depositAmount: numCv });
                    this.forceUpdate();
                  }
                  else
                    this.setState({ depositAmount: 0 });
                }}
              />
            </FormControl>
          </div>
          <div>
            <div className={"transfer-title"}>Enter Card Details</div>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#424770',
                      '::placeholder': {
                        color: '#aab7c4',
                      },
                    },
                    invalid: {
                      color: '#9e2146',
                    },
                  },
                }}
              />
          </div>

          <ElementsConsumer>
            {
              ({ elements, stripe }) => (
                <Button
                  color={'primary'}
                  onClick={this.doTransfer(elements, stripe as Stripe)}
                  variant="contained"
                  disabled={this.state.loading}
                  endIcon={
                    this.state.loading ? (
                      <CircularProgress></CircularProgress>
                    ) : null
                  }
                >{ this.state.loading ? 'Please wait' : 'Transfer' }</Button>
              )
            }
          </ElementsConsumer>
        </Paper>
        </Elements>
      </div>
    ) : (<div>{null}</div>)]);

    return (<div className={"page wallet"}>
      {this.errorDialog}
      {this.makeAppBar(this.props.router, (slides.get(this.props.subpage) as [ string, JSX.Element ])[0])}
      <div className={"main-wrapper"}>
        <div className={"hero"}>
          <div className={"money"}>
            <span >{ '$'+ Number(this.state.wallet?.balance || 0).toFixed(2) }</span>
          </div>
          <div>
            Balance
          </div>
        </div>
        <div className={"main"}>
          {
            (slides.get(this.props.subpage) as [ string, JSX.Element ])[1]
          }
        </div>
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
  const session = await WalletPage.getSession(context);

  let [not_important, not_important2, subpage] = req.url.split('/');


  const sessionUser = await getUser(session);

  if (!sessionUser || !sessionUser.marketplaceUser) {
    return {
      redirect: {
        destination: `/login`,
        permanent: false
      }
    }
  }

  const { user, wallet } = await marketplaceGetWallet(sessionUser);

  return {
    props: {
      session,
      subpage: subpage||null,
      wallet: wallet ? toWalletPojo(wallet) : null,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY as string
    }
  }
}


export default withRouter(WalletPage);
