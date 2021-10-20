import React, {ChangeEvent, PureComponent} from "react";
import style from "./../../styles/staticPage/staticPage.module.css";


/**
 * STATIC PAGES 
 */
export class StaticPage extends PureComponent {

  render() {
    const eulaPage = (
      <div className={style.eula_wrapper}>
        <div className={style.actLogo}></div>
        <h2>EULA</h2>
        <div className={style.eula_content}>
          {eulaString.map((str, idx) => (idx === 3) ? <p key={idx}>{str}<span> Guidelines.</span></p> : <p key={idx}>{str}</p>)}
        </div>
        <div>I agree</div>
      </div>
    )

    
    return (
      <div>{eulaPage}</div>
    )
  }
}

export default StaticPage

const eulaString = ['Be kind and support one another.',
                    'We strongly support equality.',
                    'We hold our users accountable for the way they treat each other, so please be kind and respectful so everyone can have a great experience on The Third Act Platform.',
                    'All users of Third Act are expected to follow our',
                    'We are happy you are here.',
                    "Let's have some fun!",
                    'Love and respect from The Third Act Team.']

