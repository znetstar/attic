import {Component} from "react";
import {useSession, getSession} from "next-auth/client";
import {MarketplaceSession} from "../api/auth/[...nextauth]";
import {
  EncodeTools,
  SerializationFormat,
  SerializationFormatMimeTypes
} from "@etomon/encode-tools/lib/EncodeTools";
import {makeEncoder} from "./_encoder";
import {Snackbar} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { RPCProxy } from './_rpcClient';
import * as _ from 'lodash'
import {NextRouter} from "next/router";

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
  notifySeverity?: 'success'|'error'|null;
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
      ...(this.state || {})
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

  get rpc() {
    return RPCProxy(this.handleError);
  }

  public static getSession(context: any): Promise<MarketplaceSession|null> {
    return getSession(context) as Promise<MarketplaceSession|null>;
  }

  get errorDialog() {
    return (
      this.state.notifyMessage ? <Snackbar open={Boolean(this.state.notifyMessage)} autoHideDuration={6000} onClose={() => this.setState({ notifyMessage: null })}>
          <Alert onClose={() => this.setState({ notifyMessage: null, notifySeverity: null })} severity={this.state.notifySeverity || 'error'}>
            {this.state.notifyMessage}
          </Alert>
        </Snackbar> : null
    )
  }
}

export default SessionComponent;
