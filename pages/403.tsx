import {PureComponent} from "react";

export class AccessDenied extends PureComponent {
  render() {
    return (
      <div className={"error page"}>
        <h2>Access Denied</h2>
        <a href={"/"}>Go Home</a>
      </div>
    )
  }
}
export default AccessDenied;
