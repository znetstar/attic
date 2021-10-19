import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import * as React from "react";
import {PureComponent} from "react";
import {SubcomponentProps, SubcomponentPropsWithRouter} from "./_session-component";

import styles from './../../styles/navbar.module.css';
import { withRouter } from "next/router";

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
    console.log('home')
    this.setState({ icon: 1 })
    this.props.router.push('/')
  }
  discover = () => {
    console.log('discover')
    this.setState({ icon: 2 })
    this.props.router.push('/discover')
  }
  wallet = () => {
    console.log('wallet')
    this.setState({ icon: 3 })
    this.props.router.push('/wallet/deposit')
  }
  profile = () => {
    console.log('profile')
    this.setState({ icon: 4 })
    this.props.router.push('/profile/self')
  }
  render() {
    return (
      <div className={styles.navbar_wrapper}>
        <div className={styles.nav}>
          <div className={styles.tab} 
               onMouseEnter={() => this.setState({ icon: 1 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.home}>
                <HomeIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 1 ? styles.dot : styles.noDot}></div>
                </div>
          </div>

          <div className={styles.tab} 
               onMouseEnter={() => this.setState({ icon: 2 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.discover}>
                <SearchIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 2 ? styles.dot : styles.noDot}></div>
                </div>
          </div>

          <div className={styles.tab} 
               onMouseEnter={() => this.setState({ icon: 3 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.wallet}>
                <AccountBalanceWalletIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 3 ? styles.dot : styles.noDot}></div>
                </div>
          </div>

          <div className={styles.tab} 
               onMouseEnter={() => this.setState({ icon: 4 })} 
               onMouseLeave={() => this.setState({ icon: 0 })} 
               onClick={this.profile}>
                <AccountCircleIcon />
                <div className={styles.dot_wrapper}>
                  <div className={this.state.icon === 4 ? styles.dot : styles.noDot}></div>
                </div>
          </div>
        </div>
      </div>
    )
  }
}

export default withRouter(NavBar);
