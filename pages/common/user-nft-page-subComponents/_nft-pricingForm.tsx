import React, {PureComponent} from "react";
import { Button, FormControl, RadioGroup, Radio, FormControlLabel, TextField, InputAdornment, FormLabel } from "@mui/material/";


import {NextRouter, withRouter} from "next/router";

import SessionComponent, {SessionComponentProps, SessionComponentState} from "../../common/_session-component";
import { INFT } from "../_nft";
import { IUser } from "../_user";
import {SearchBar} from "./../_searchBar"
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-pricingForm.module.css";
import {diff, jsonPatchPathConverter} from "just-diff";

import {RoyaltyAdd} from "./_royaltyAdd"

type NftPricingProps = SessionComponentProps&{
  nftForm: INFT;
  onFormChange: Function;
  originalNftForm: INFT;
  usersList: IUser[];
  currUser: IUser;
}

type PricingState = SessionComponentState&{
  showScheduleInputs: boolean;
  scheduleDate: string;
  scheduleTime: string;
  isUserSeller: string;
  showSellerInput: boolean;
}

/**
 * Allows the user to upload NFT Pricing MetaData
 */
export class NFTPricingForm extends SessionComponent<NftPricingProps,PricingState> {

  constructor(props: NftPricingProps) {
    super(props);
  }

  state: PricingState = {
    showScheduleInputs : false,
    scheduleDate: this.props.nftForm.listOn ? new Date(this.props.nftForm.listOn).toLocaleDateString() : '',
    scheduleTime: this.props.nftForm.listOn ? new Date(this.props.nftForm.listOn).toLocaleTimeString() : '',
    isUserSeller: 'Yes',
    showSellerInput: false
  }

  onSellerSet = (e) => {
    this.setState({ isUserSeller: e.target.value },() => {
      if (this.state.isUserSeller === 'No') {
        this.setState({ showSellerInput: true })
      } else {
        this.setState({ showSellerInput: false }) 
        this.props.onFormChange('sellerId', this.props.currUser._id)
      }
    })
  }

  setSeller = (user) => {
    if (user && this.state.isUserSeller === 'No') {
      this.props.onFormChange('sellerId', user._id)
    }
  }

  scheduleDateTime = () => {
    let listOnTime = '';
    if(this.state.scheduleDate && this.state.scheduleTime && this.state.showScheduleInputs) {
      listOnTime = new Date(this.state.scheduleDate + ' ' + this.state.scheduleTime).toISOString();
    } else {
      listOnTime = new Date().toISOString();
    }
    this.props.onFormChange('listOn', listOnTime);
    return listOnTime;
  }

  submitRoyaltyList = (royaltyList) => {
      this.props.onFormChange('royalties', royaltyList)
  }

  submitNewNft = (dataNft: INFT) => {
    let patches = diff((this as any).props.originalNftForm, dataNft, jsonPatchPathConverter);
    patches = patches
      .filter(f => f.path.substr(0, '/nftItem'.length) !== '/nftItem')
      .map((f) => {
        if (f.value === '')
          return {
            ...f,
            value: null
          }
        return f;

      });
    this.rpc['marketplace:patchNFT']((this as any).props.originalNftForm._id, patches as any)
      .then((res) => {
        this.handleError('NFT created', 'success')
        // this.props.router.push('/profile')
      })
      .catch(this.handleError)
  }

  updatePricingForm(e: SubmitEvent): void {
    e.preventDefault();
    let nftForm = {...this.props.nftForm, listOn: this.scheduleDateTime()}
    if(!nftForm.image) {
      console.log('please add NFT item')
    } else {
      this.submitNewNft(nftForm)
    }
  }

  render() {
    const { nftForm, onFormChange } = this.props
    return (
      <div className={styles.nftForm_wrapper}>
        <form onSubmit={(e) => this.updatePricingForm(e)}>
            <div>
            <FormControl className={'form-control'}>
              <RadioGroup
                aria-label="listing"
                defaultValue="listOnSubmit"
                name="listOn"
                onChange={(e) => {if(e.target.value === 'listOnSubmit') {
                                    this.setState({ showScheduleInputs: false, scheduleDate: '', scheduleTime: '' })}
                                   else {this.setState({ showScheduleInputs : true })}}
                                  }>
                <FormControlLabel value="listOnSubmit" control={<Radio />} label="List when I submit" />
                <FormControlLabel value="listOnSchedule" control={<Radio />} label="Schedule listing" />
              </RadioGroup>
            </FormControl>
            </div>
            {(this.state.showScheduleInputs) ? (
                          <div>
                          <FormControl className={'form-control'}>
                            <TextField onChange={(e) => { this.setState({ scheduleDate: e.target.value}); this.scheduleDateTime()}} value={this.state.scheduleDate} required={true} className={'form-input'}  variant={"filled"} name={"listOnDate"} label="Date" type="date" />
                          </FormControl>
                          <FormControl className={'form-control'}>
                          <TextField onChange={(e) => { this.setState({ scheduleTime: e.target.value}); this.scheduleDateTime()}} value={this.state.scheduleTime} required={true} className={'form-input'}  variant={"filled"} name={"listOnTime"} label="Time" type="time" InputProps={{ inputProps: { step: 1}}}/>
                          </FormControl>
                        </div>
            ) : ''}

            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { if(parseFloat(e.target.value) < 0) {e.target.value = '0'; return}; onFormChange(e.target.name, Math.floor(parseFloat(e.target.value)*100)/100) }} value={nftForm.priceStart} required={false} type="number" className={'form-input'}  variant={"filled"} name={"priceStart"} label="Starting Price" InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0, step:0.01}}}/>
              </FormControl>
            </div>

            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { if(parseFloat(e.target.value) < 0) {e.target.value = '0'; return}; onFormChange(e.target.name, Math.floor(parseFloat(e.target.value)*100)/100) }} value={nftForm.priceBuyNow} required={false} type="number" className={'form-input'}  variant={"filled"} name={"priceBuyNow"} label="Buy Now Price" InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0, step:0.01}}} />
              </FormControl>
            </div>
            
            <div>
            <FormControl component="fieldset">
              <FormLabel component="legend">Are you the Seller?</FormLabel>
              <RadioGroup row aria-label="seller" name="seller-Selection" value={this.state.isUserSeller} onChange={this.onSellerSet}>
                <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="No" control={<Radio />} label="No" />
              </RadioGroup>
              </FormControl>
            </div>
            
            {this.state.showSellerInput ? (
              <div><SearchBar searchMenu={this.props.usersList} onSelect={(user) => this.setSeller(user)}/></div>
            ) : ''}

            <div><RoyaltyAdd submitRoyaltyList={this.submitRoyaltyList} usersList={this.props.usersList} /></div>

            <div>
            <FormControl className={'form-control'}>
                <Button style={{ width: '50%' }} type={"button"} variant="contained" color="primary" disabled>
                  Back
                </Button>
              </FormControl>
              <FormControl className={'form-control'}>
                <Button style={{ width: '50%' }} type={"submit"} variant="contained" color="primary">
                  Next
                </Button>
              </FormControl>
            </div>
          </form>
      </div>
    )
  }
}

export default withRouter(NFTPricingForm)
