import {PureComponent} from "react";

export class NotFoundPage extends PureComponent {
  render() {
    return (
      <div className={"error page"}>
        <h2>Resource Not Found</h2>
        <a href={"/"}>Go Home</a>
      </div>
    )
  }
}
export default NotFoundPage;
