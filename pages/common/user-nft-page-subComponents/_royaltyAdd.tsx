import React, {Fragment, PureComponent} from "react"
import { TextField } from "@mui/material/";
import AddCircleIcon from '@mui/icons-material/AddCircle';

import {IUser} from "./../../common/_user"
import {SearchBar} from "./../_searchBar"
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-royaltyAdd.module.css";

export type payee = {
  owedTo: string;
  percent: number;
}

type royaltyProps = {
  submitRoyaltyList: Function;
  usersList: IUser[];
}

type royaltyAddState = {
  payee: payee[];
  showAdd: boolean;
  showOptions: boolean
}

export class RoyaltyAdd extends PureComponent<royaltyProps> {

  constructor(props:royaltyProps) {
    super(props);
  }

  state: royaltyAddState = {
    payee: [],
    showAdd : true,
    showOptions: true
  }

  percentChange = i => e => {
    let payee = [...this.state.payee]

    // if input percent greater than 100 and less than 0; not allow
    if(parseFloat(e.target.value) <= 0 || parseFloat(e.target.value) > 100) {e.target.value = '0'; return};

    payee[i].percent = Math.floor(parseFloat(e.target.value)*100)/100
    this.setState({ payee: payee, showAdd: false, showOptions: true })
  }


  emailChange = (i, user) => {
    let payee = [...this.state.payee]
    if(user) {
      payee[i].owedTo = user._id
      this.setState({ payee: payee, showAdd: false, showOptions: true })
    }
  }


  remove = i => e => {
    e.preventDefault()
    let payee = [
      ...this.state.payee.slice(0, i),
      ...this.state.payee.slice(i + 1)
    ]
    this.setState({ payee, showAdd: true, showOptions: true })
  }

  onConfirm = e => {
    // if total sum af percent is greater than 0; not allow
    if(this.state.payee.length > 0) {
      let percentSum = this.state.payee.reduce((acc, p) => acc + p.percent, 0);
      if (percentSum > 100 || (this.state.payee[this.state.payee.length - 1].owedTo === '')) {
        return;
      } else if (percentSum === 100) {
        this.props.submitRoyaltyList(this.state.payee)
        this.setState({ showOptions: false })
      }
    }
      this.setState({ showAdd: true })
  }

  addCoOwner = e => {
    e.preventDefault()
    let payee = this.state.payee.concat([{owedTo: '', percent: 0}])
    this.setState({ payee: payee, showAdd: false })
  }

  render() {
    return (
      <Fragment>
        <h2>Royalties</h2>
        {this.state.payee.map((p, idx) => (
          <div key={idx} className={styles.inputSection}>
            <SearchBar searchMenu={this.props.usersList} onSelect={(user) => this.emailChange(idx,user)}/>
            <TextField onChange={this.percentChange(idx)} 
                        value={p.percent} 
                        required={true} 
                        type="number" 
                        InputProps={{ inputProps: {min: 0, max: 100} }} 
                        className={'form-input'}  
                        name={"percent"} 
                        label="percent" />

            <button onClick={this.remove(idx)}>X</button>
          </div>
        ))}
        {this.state.showOptions ? this.state.showAdd ? (        
        <div onClick={this.addCoOwner} className={styles.addButton}>
          <AddCircleIcon />
          <h2>Add Payee</h2>
        </div>) 
        : (
          <div onClick={this.onConfirm}>Confirm Payee</div>
        ) : ''}
      </Fragment>
    )
  }
}

export default RoyaltyAdd
