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
import {HTTPError, TokenSupplyType, TokenType} from "../common/_rpcCommon";
import {toPojo} from "@thirdact/to-pojo";
import {getUser, MarketplaceSession} from "../api/auth/[...nextauth]";
import Button from "@mui/material/Button";
import {UserRoles} from "../common/_user";
import {ICryptoAccount} from "../common/_account";
import {ITransaction, Transaction as MarketplaceTransaction} from "../common/_wallet";
import {IPOJOWallet, marketplaceGetWallet, toWalletPojo} from "../common/_wallet";
import {loadStripe, Stripe} from "@stripe/stripe-js";
import {CardElement, Elements, ElementsConsumer} from '@stripe/react-stripe-js';
import {OutlinedInput, Paper} from "@mui/material";
import {signIn} from "next-auth/client";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import {InputAdornment} from "@mui/material/";
import {IToken} from "../common/_token";
import {ISellerInfo} from "../common/_sellerInfo";
const moment = require('moment');

export enum WalletPageSlide {
  transactions = 'transactions',
  deposit = 'deposit',
  withdraw = 'withdraw'
}

export type WalletProps = SessionComponentProps&{
  subpage: WalletPageSlide;
  wallet: IPOJOWallet|null;
  stripePublicKey: string;
  transactions: TransactionGroup[]|null;
};

/**
 * Internal state for the Listing page
 */
export type WalletState = SessionComponentState&{
  depositAmount?: number;
  loading?: boolean;
  subpage: WalletPageSlide;
  wallet: IPOJOWallet|null;
};

export type  TransactionGroupToken = {
  _id: string,
  symbol: string,
  tokenType: TokenType,
  supplyType: TokenSupplyType,
  name: string,
  decimals: number,
  createdAt: Date,
  updatedAt: Date,
  tokenId: string,
  imageUrl?: string,
  isLegalTender: boolean;
  sellerInfo?: ISellerInfo;
}


export type TransactionGroup = {
  // actions: ITransaction[];
  // actions: (ITransaction&{ token: TransactionGroupToken })[],
  legalTenderToken: TransactionGroupToken,
  action: (ITransaction&{ token: TransactionGroupToken }),
  _id: Buffer;
  completedAt: Date;
  netAmount: number;
  netLegalTenderAmount: number;
  counterparty?: ISellerInfo;
}

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
        <Button
          type="submit"
          disabled={!stripe}
          color={'primary'}
          variant="contained"
        >
          Pay
        </Button>
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
    wallet: this.props.wallet,
    subpage: this.props.subpage
  } as WalletState

  stripe: Stripe|null = null;

  constructor(props: WalletProps) {
    super(props);
  }

  updateInterval: any;

  componentWillUnmount() {
    clearInterval(this.updateInterval);
  }

  async componentDidMount() {
    this.stripe = await loadStripe(this.props.stripePublicKey);

    this.forceUpdate();

    if (this.updateInterval)  {
      clearInterval(this.updateInterval);
    }
    this.updateInterval = setInterval(() => {
      this.loadBalance()
        .catch((err: Error) => this.handleError(err));
    }, 25e3);

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

        const paymentIntentResult = await this.stripe?.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement
          }
        });

        if (paymentIntentResult?.error) {
          throw paymentIntentResult.error;
        }

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
          // this.props.router.back()
        }
      }
    }
  }

  protected slides?: any;

  render() {
    const slides: any = this.slides = {};

    slides[WalletPageSlide.transactions] = ['Transactions', (
      <div className={"paper-wrapper"}>
        <Paper elevation={1}
               color={'primary'}
        >
          {
            (this.props.transactions || []).map((trans: TransactionGroup) => {
              return (
                <div className={"transaction"}>
                  <div className={"transaction-image"}>
                    {
                      trans.action.token.imageUrl ? (
                        <img src={trans.action.token.imageUrl}></img>
                      ) : (
                        <span className={"green-dot"}></span>
                      )
                    }
                  </div>
                  <div  className={"transaction-text"}>
                    <div>
                      {
                        trans.action.token.isLegalTender ? 'You deposited funds' : (
                          !Math.sign(Number(trans.netLegalTenderAmount)) ? (
                            <React.Fragment>
                              You purchased <a href={"/listing/"+trans.action.token._id.toString()}>{trans.action.token.name}</a> from <a href={"/profile/"+trans.counterparty?._id.toString()}>{trans.counterparty?.firstName}</a>
                            </React.Fragment>
                          ) : (
                            <React.Fragment>
                              <a href={"/profile/"+trans.counterparty?._id.toString()}>{trans.counterparty?.firstName}</a> purchased <a href={"/listing/"+trans.action.token._id.toString()}>{trans.action.token.name}</a> from <a href={"/profile/"+trans.action.token.sellerInfo?._id.toString()}>{trans.action.token.sellerInfo?.firstName}</a>
                            </React.Fragment>

                          )
                        )
                      }
                    </div>
                    <div className={"date"}><time dateTime={(new Date(trans.completedAt)).toISOString()}>{moment(trans.completedAt).format('MMM Do YYYY, h:mm A')}</time></div>
                  </div>
                  <div  className={"transaction-amount"}>
                    <div>
                      <span className={!Math.sign(Number(trans.netLegalTenderAmount)) ? 'sign-debit' : 'sign-credit'}>$</span>
                      <span>{trans.netLegalTenderAmount}</span>
                    </div>
                  </div>
                </div>
              )
            })
          }
        </Paper>
      </div>
    )];
    slides[WalletPageSlide.deposit] = ['Deposit', this.stripe  ? (
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
                >{ this.state.loading ? 'Please wait' : 'Deposit' }</Button>
              )
            }
          </ElementsConsumer>
        </Paper>
        </Elements>
      </div>
    ) : (<div>{null}</div>)];

    console.log(this.state.subpage)
    return (<div className={"page wallet"}>
      {this.errorDialog}
      {this.makeAppBar(this.props.router, (slides[(this.state.subpage)] as [ string, JSX.Element ])[0])}
      <div className={"main-wrapper"}>
        <div className={"hero"}>
          <div className={"money"}>
            <span >{ '$'+ Number(this.state.wallet?.balance || 0).toFixed(2) }</span>
          </div>
          <div>
            Balance
          </div>
        </div>
        <div className={"buttons"}>
          <div className={"button-bar"}>
            <Button
              color={'primary'}
              onClick={() => {
                this.setState({
                  subpage: this.state.subpage === 'deposit' ? 'transactions' : 'deposit'
                })
              }}
              variant="contained">{this.state.subpage === 'deposit' ? 'Transactions' : 'Deposit'}</Button>
            <Button
              color={'primary'}
              onClick={() => this.props.router.push('/wallet/transfer')}
              variant="contained">Transfer</Button>
          </div>
        </div>
        <div className={"main"}>
          {
            (slides[(this.state.subpage)] as [ string, JSX.Element ])[1]
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

  if (!subpage) {
    subpage = 'deposit';
  };


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

  let transactions: {   }[] = [];
  if (wallet && wallet !== null) {
    let checking = await wallet.accounts.filter((f) => f.name === 'checking')[0] as ICryptoAccount;
    transactions = await MarketplaceTransaction.aggregate([
      {
        $match: {
          account: checking._id
        }
      },
      {
        $group: {
          _id: '$token',
          doc: {
            $push: '$$ROOT'
          }
        }
      },
      {
        $lookup: {
          from:  'tokens',
          as: 'token',
          let: { tokenId:  '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [ '$$tokenId', '$_id' ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                symbol: 1,
                tokenType: 1,
                supplyType: 1,
                name: 1,
                decimals: 1,
                createdAt: 1,
                updatedAt: 1,
                tokenId: 1,
                imageUrl: 1,
                sellerInfo: 1
              }
            }
          ]
        }
      },
      {
        $unwind: '$doc'
      },
      {
        $addFields: {
          'doc.token': {
            $arrayElemAt: [ '$token', 0 ]
          }
        }
      },
      {
        $replaceRoot:  {
          newRoot: '$doc'
        }
      },
      {
        $addFields: {
          counterparty: '$counterparty.userInfo',
          'token.isLegalTender':  { $eq: [ '$token.symbol', process.env.MARKETPLACE_LEGAL_TENDER_FOR_PURCHASE ] },
          legalTenderToken: {
            $cond: [
              { $eq: [ '$token.symbol', process.env.MARKETPLACE_LEGAL_TENDER_FOR_PURCHASE ] },
              '$token',
              null
            ]
          },
          legalTenderAmount: {
            $cond: [
              { $eq: [ '$token.symbol', process.env.MARKETPLACE_LEGAL_TENDER_FOR_PURCHASE ] },
              '$amount',
              0
            ]
          }
        }
      },
      {
        $sort: {
          createdAt: -1
        }
      },
      {
        $group: {
          _id: '$receipt',
          actions: {
            $push: '$$ROOT'
          },
          completedAt: {
            $max: '$createdAt'
          },
          netAmount: {
            $sum: '$amount'
          },
          netLegalTenderAmount: {
            $sum: '$legalTenderAmount'
          },
          legalTenderToken: {
            $max: '$legalTenderToken'
          },
          isNFTPurchase: {
            $max: '$token.isLegalTender'
          }
        }
      },
      {
        $addFields:  {
          isNFTPurchase: {
            $ne: [ '$isNFTPurchase', true ]
          },
          netAmount: { $toLong: '$netAmount' },
          netLegalTenderAmount: { $toLong: '$netLegalTenderAmount' }
        }
      },
      {
        $sort:  {
          completedAt: -1
        }
      },
      {
        $unwind: '$actions'
      },
      {
        $addFields: {
          action: '$actions'
        }
      },
      {
        $project:  {
          actions: 0
        }
      }
    ]).exec();
  }

  return {
    props: {
      session,
      transactions: transactions ? toPojo(transactions) : null,
      subpage: subpage||null,
      wallet: wallet ? toWalletPojo(wallet) : null,
      stripePublicKey: process.env.STRIPE_PUBLIC_KEY as string
    }
  }
}


export default withRouter(WalletPage);
