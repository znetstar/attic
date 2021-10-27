import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import * as React from "react";
import Link from 'next/link';
import SessionComponent, {
  SessionComponentProps,
  SessionComponentState,
} from "../common/_session-component";
import {getUser} from "../api/auth/[...nextauth]";
import {marketplaceGetWallet, IPOJOWallet, toWalletPojo} from "./../common/_wallet";

import styles from './../../styles/navbar.module.css';

type NavBarProps =  SessionComponentProps&{
  wallet: IPOJOWallet|null;
  pop:string;
}
type NavBarState =  SessionComponentState&{
  icon: number;
}

export class NavBar extends SessionComponent<NavBarProps, NavBarState> {
  constructor(props: NavBarProps) {
    super(props);
  }
  state = {
    icon : 0
  } as NavBarState

  home = () => {
    this.setState({ icon: 1 })
  }

  discover = () => {
    this.setState({ icon: 2 })
  }

  wallet = () => {
      this.setState({ icon: 3 })
  }

  profile = () => {
      this.setState({ icon: 4 })
  }

  render() {
    return (
      <div className={styles.navbar_wrapper}>
        <div className={styles.nav}>
          <Link href='/' passHref>
          <div className={styles.tab} 
               onMouseEnter={() => this.setState({ icon: 1 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.home}>
                <HomeIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 1 ? styles.dot : styles.noDot}></div>
                </div>
          </div>
          </Link>

          <Link href='/discover' passHref>
          <div className={styles.tab} 
               onMouseEnter={() => this.setState({ icon: 2 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.discover}>
                <SearchIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 2 ? styles.dot : styles.noDot}></div>
                </div>
          </div>
          </Link>

          <Link href={this.props?.wallet ? '/wallet/deposit' : ''} passHref>
          <div className={this.props?.wallet ? styles.tab : styles.noTab} 
               onMouseEnter={() => this.setState({ icon: 3 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.wallet}>
                <AccountBalanceWalletIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 3 ? styles.dot : styles.noDot}></div>
                </div>
          </div>
          </Link>

          <Link href={this.props.session?.user ? '/profile/self' : '/login'} passHref>
          <div className={this.props.session?.user ? styles.tab : styles.noTab} 
               onMouseEnter={() => this.setState({ icon: 4 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.profile}>
                <AccountCircleIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 4 ? styles.dot : styles.noDot}></div>
                </div>
          </div>
          </Link>
        </div>
      </div>
    )
  }
}


export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await NavBar.getSession(context);

  const user = (await getUser(session))

  const { u, wallet } = await marketplaceGetWallet(user);

  return {
    props: {
      session,
      wallet: wallet ? toWalletPojo(wallet) : null,
      pop: 'pop'
    }
  }
}



export default NavBar;
