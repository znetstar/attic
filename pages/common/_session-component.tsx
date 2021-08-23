import { Session } from "next-auth";
import {Component} from "react";
import {useSession, getSession} from "next-auth/client";
import {MarketplaceSession} from "../api/auth/[...nextauth]";

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

export interface SessionComponentState {}

export abstract class SessionComponent<P extends SessionComponentProps, S extends SessionComponentState> extends Component<P, S> {
  protected constructor(props: P) {
    super(props);
  }

  public static getSession(context: any): Promise<MarketplaceSession|null> {
    return getSession(context) as Promise<MarketplaceSession|null>;
  }
}

export default SessionComponent;
