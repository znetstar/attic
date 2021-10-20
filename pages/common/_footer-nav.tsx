import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import * as React from "react";
import {PureComponent} from "react";
import {SubcomponentPropsWithRouter} from "./_session-component";
import Link from 'next/link';

import styles from './../../styles/navbar.module.css';

export type NavBarProps =  SubcomponentPropsWithRouter&{
}
export type NavBarState =  {
  icon: number;
}

export class NavBar extends PureComponent<NavBarProps, NavBarState> {
  state = {
    icon : 0
  }

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
    console.log(this.props)
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

          <Link href={this.props?.wallet ? '/wallet/deposit' : '/login'} passHref>
          <div className={styles.tab} 
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
          <div className={styles.tab} 
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

export default NavBar;
