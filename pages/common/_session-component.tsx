import { Session } from "next-auth";
import {Component} from "react";
import {useSession, getSession} from "next-auth/client";
import {MarketplaceSession} from "../api/auth/[...nextauth]";
import {
  EncodeTools,
  MimeTypesSerializationFormat,
  SerializationFormat,
  SerializationFormatMimeTypes
} from "@etomon/encode-tools/lib/EncodeTools";
import {MakeEncoder} from "./_encoder";
import {Snackbar} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { RPCProxy } from './_rpcClient';
import {ModelInterfaceResponse} from "@thirdact/simple-mongoose-interface";
import {Buffer} from "buffer";
import * as _ from 'lodash'
import {NextRouter} from "next/router";

export interface SessionComponentProps {
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
  errorMessage?: string|null
  errorSeverity?: 'success'|'error'|null;

}

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

export abstract class SessionComponent<P extends SessionComponentProps, S extends SessionComponentState> extends Component<P, S> {
  protected constructor(props: P) {
    super(props);

    this.state = {
      ...(this.state || {})
    };
  }

  public enc: EncodeTools = MakeEncoder();
  get serializationMimeType() {
    return SerializationFormatMimeTypes.get(this.enc.options.serializationFormat as SerializationFormat) as string;
  }

  handleError = (err: unknown, severity: 'success'|'error' = 'error') => {
    this.setState({
      ...this.state,
      errorMessage:  _.get(err, 'data.message') || _.get(err, 'innerError.message') || (err as Object).toString(),
      errorSeverity: severity
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
      this.state.errorMessage ? <Snackbar open={Boolean(this.state.errorMessage)} autoHideDuration={6000} onClose={() => this.setState({ errorMessage: null })}>
          <Alert onClose={() => this.setState({ errorMessage: null, errorSeverity: null })} severity={this.state.errorSeverity || 'error'}>
            {this.state.errorMessage}
          </Alert>
        </Snackbar> : null
    )
  }
}

export default SessionComponent;
