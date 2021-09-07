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
import {ModelInterfaceResponse} from "@thirdact/simple-mongoose-interface";
import {Buffer} from "buffer";

export interface SessionComponentProps {
  session: MarketplaceSession;
  loading: any;
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
  }

  public enc: EncodeTools = MakeEncoder();
  get serializationMimeType() {
    return SerializationFormatMimeTypes.get(this.enc.options.serializationFormat as SerializationFormat) as string;
  }

  handleError = (err: Error) => {
    this.setState({ ...this.state, errorMessage: err.toString() })
    this.forceUpdate();
  }

  async apiRequest<T>(url: RequestInfo, req: RequestInit): Promise<T|{_id: string}|null> {
    let body: { result: T }|{ error: { message: string } }|null = null;

    req.headers = {
      ...req.headers,
      'Content-Type': this.serializationMimeType,
      'Accept': this.serializationMimeType
    };

    const resp = await fetch(url, {
      ...req
    });

    let serializationFormat = this.enc.options.serializationFormat as SerializationFormat;

    if (resp.headers.get('content-type')) {
      let mime = resp.headers.get('content-type');
      if (mime) {
        serializationFormat = MimeTypesSerializationFormat.has(mime) ? MimeTypesSerializationFormat.get(mime) as SerializationFormat : serializationFormat;
      }
    }

    if (resp.body) {
      body = this.enc.deserializeObject<{ result: T }|{ error: { message: string } }>(await resp.arrayBuffer(), serializationFormat);
    }

    if (resp.status === 200 && resp.body) {
      return (body as { result: T }).result;
    }
    else if (resp.status === 204) {
      return null;
    }
    else if (resp.status >= 400 && resp.status < 600) {
      let message: string|undefined;
      if (body) {
        message = (body as { error: { message: string } }).error.message;
      }
      throw new RESTError(message, resp.status);
    } else if (resp.status === 201) {
      return { _id: (( resp.headers.get('location') as string).split('/').pop() as string).split('&').shift() } as { _id: string };
    } else {
      throw new RESTError(`Invalid Response Format`, resp.status)
    }
  }

  public static getSession(context: any): Promise<MarketplaceSession|null> {
    return getSession(context) as Promise<MarketplaceSession|null>;
  }

  get errorDialog() {
    return (
      this.state.errorMessage ? <Snackbar open={Boolean(this.state.errorMessage)} autoHideDuration={6000} onClose={() => this.setState({ errorMessage: null })}>
          <Alert onClose={() => this.setState({ errorMessage: null })} severity="error">
            {this.state.errorMessage}
          </Alert>
        </Snackbar> : null
    )
  }
}

export default SessionComponent;
