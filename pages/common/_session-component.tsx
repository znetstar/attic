import {Component, PureComponent} from "react";
import {useSession, getSession} from "next-auth/client";
import {MarketplaceSession} from "../api/auth/[...nextauth]";
import {
  EncodeTools,
  SerializationFormat,
  SerializationFormatMimeTypes
} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import Snackbar  from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { RPCProxy } from './_rpcClient';
import * as _ from 'lodash'
import {NextRouter} from "next/router";
import {MarketplaceAPI} from "./_rpcCommon";
import {IEncodeTools} from "@etomon/encode-tools";
import {LoginButton, MarketplaceAppBar, SettingsButton} from "./_appbar";
import * as React from "react";
import LoginIcon from '@mui/icons-material/Login';

export type NotifySeverity = 'success'|'error';
export type HandleErrorFunction = (err: Error|{ message: string, [name: string]: unknown }|{data:{message:string, [name: string]: unknown}, [name: string]: unknown}|{innerError:{message:string, [name: string]: unknown}, [name: string]: unknown}|string, severity?: NotifySeverity) => void;


export type ErrorDialogProps = {
  notifyMessage?: string|null,
  autoHideDuration?: number,
  onClose: () => void;
  notifySeverity?: NotifySeverity
}


export type SubcomponentProps = {
  session?: MarketplaceSession;
  rpc: MarketplaceAPI;
  handleError: HandleErrorFunction;
  errorDialog: JSX.Element;
  enc: IEncodeTools
  router?: NextRouter;
  pageTitle: string;
}
export type SubcomponentPropsWithRouter  = SubcomponentProps&{
  router: NextRouter;
}

export type AuthenticatedSubcomponentProps = SubcomponentProps&{
  session: MarketplaceSession;
}

export class ErrorDialog extends PureComponent<ErrorDialogProps> {
  render() {
    return (
      this.props.notifyMessage ? <Snackbar
        open={Boolean(this.props.notifyMessage)}
        autoHideDuration={this.props.autoHideDuration||10e3}
        anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
      >
        <Alert
          onClose={this.props.onClose}
          severity={(this.props.notifySeverity || 'error')}  >
          {this.props.notifyMessage}
        </Alert>
      </Snackbar> : null
    )
  }
}

/**
 * User-related props will be accessible on every page
 */
export interface SessionComponentProps {
  /**
   * The actively logged-in session
   */
  session: MarketplaceSession;
  loading: any;
  router: NextRouter;
}

export const withSession = (component: any) => (props: any) => {
  const [session, loading] = useSession()

  if ((component).prototype.render) {
    // @ts-ignore
    return <component session={session} loading={loading} {...props} />
  }

  throw new Error([
    "You passed a function component, `withSession` is not needed.",
    "You can `useSession` directly in your component."
  ].join("\n"))
};

export interface SessionComponentState {
  /**
   * Message that will be showed to the user as a floating notification
    */
  notifyMessage?: string|null
  /**
   * The severity of the message that will be showed to the user
   */
  notifySeverity?: NotifySeverity
  settingsOpen?: boolean;
  pageTitle: string;
}

/**
 * Represents a REST API error
 */
export class RESTError extends Error {
  public message: string;

  constructor(
    message?: string,
    public httpCode?: number
  ) {
    super(message);
    this.message = `API Error, status code ${httpCode}`;
  }
}

/**
 * Base `Component` to be used in all Components that are rendered with user session data (i.e., all pages).
 */
export abstract class SessionComponent<P extends SessionComponentProps, S extends SessionComponentState> extends Component<P, S> {
  protected constructor(props: P) {
    super(props);

    this.state = {
      ...(this.state || {}),
      // @ts-ignore
      pageTitle: this.props.pageTitle
    };
  }

  /**
   * `Encode Tools`  instance used to serialize data between the client/server
   */
  public enc: EncodeTools = makeEncoder();

  /**
   * MIME type of the data serialization format (e.g., "application/json")
   */
  get serializationMimeType() {
    return SerializationFormatMimeTypes.get(this.enc.options.serializationFormat as SerializationFormat) as string;
  }

  /**
   * Displays an error as a notification
   * @param err Error object
   * @param severity
   */
  handleError = (err: Error|{ message: string, [name: string]: unknown }|{data:{message:string, [name: string]: unknown}, [name: string]: unknown}|{innerError:{message:string, [name: string]: unknown}, [name: string]: unknown}|string, severity: 'success'|'error' = 'error') => {
    this.setState({
      ...this.state,
      notifyMessage:  _.get(err, 'data.message') || _.get(err, 'innerError.message') || (err as Object).toString(),
      notifySeverity: severity
    })
    this.forceUpdate();
  }


  protected fromQueryString(key: string): string|null {
    return (this.props.router.query && this.props.router.query[key] || null) as string | null;
  }

  get rpc() {
    return RPCProxy((error) => {
      this.handleError(error);
      throw error;
    });
  }

  public static getSession(context: any): Promise<MarketplaceSession|null> {
    return getSession(context) as Promise<MarketplaceSession|null>;
  }

  get errorDialog() {
    return (
      <ErrorDialog
        notifyMessage={this.state.notifyMessage}
        onClose={() => this.setState({ notifyMessage: null, notifySeverity: 'error' }) }
        notifySeverity={this.state.notifySeverity}
      ></ErrorDialog>
    )
  }

  public makeAppBar(router: NextRouter, pageTitle?: string) {
    if (!pageTitle) {
      pageTitle = this.state.pageTitle;
    }
    return (
      <MarketplaceAppBar
        {...this.subcomponentProps()}
        router={router}
        rightSideOfAppbar={
          this.props.session ? (
            <SettingsButton
              onOpen={() => this.setState({ settingsOpen: true })}
              onClose={() => this.setState({ settingsOpen: false })}
              onProfileOpen={() => router.push('/profile/self')}
              open={Boolean(this.state.settingsOpen)}
              {...this.subcomponentProps()}
              router={router}
            ></SettingsButton>
          ) : (
            <LoginButton
              {...this.subcomponentProps()}
              router={router}
            />
          )
        }
        pageTitle={pageTitle} />
    );
  }

  protected subcomponentProps(): SubcomponentProps {
    return {
      enc: this.enc,
      session: this.props.session,
      errorDialog: this.errorDialog,
      rpc: this.rpc,
      handleError: this.handleError,
      pageTitle: this.state.pageTitle
    }
  }
}

export default SessionComponent;
