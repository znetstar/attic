import { Component} from "react";

export class MarketplaceLogo extends Component {
  render() {
    return (
      <div className={'marketplace-logo'}>
        {/* <div className={'marketplace-logo-title'}>Third Act</div> */}
        <div className={'marketplace-logo-contents'}>
          <img src={'/logo/vector/logo-white.svg'}></img>
        </div>
      </div>
    )
  }
}
export default MarketplaceLogo;
