import React, {PureComponent} from "react";
import { Button, FormControl, RadioGroup, Radio, FormControlLabel, TextField, InputAdornment, Menu, MenuItem } from "@mui/material/";
import AddCircleIcon from '@mui/icons-material/AddCircle';
import {NextRouter, withRouter} from "next/router";

import SessionComponent, {SessionComponentProps, SessionComponentState} from "../../common/_session-component";
import { INFTData } from "./../_ntf-collection";
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-pricingForm.module.css";
import {diff, jsonPatchPathConverter} from "just-diff";

type NftPricingProps = SessionComponentProps&{
  nftForm: INFTData;
  onFormChange: Function;
  orignalNftForm: INFTData;
}

type coOwner = {
  owedToId: string;
  owedTo: string;
  percent: number;
}

type PricingState = SessionComponentState&{
  showScheduleInputs: boolean;
  scheduleDate: string;
  scheduleTime: string;
  openMenu: boolean;
  menuAnchor: HTMLElement | null,
  coOwner: coOwner,
  royaltyList: coOwner[]
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
    openMenu: false,
    menuAnchor: null,
    coOwner: {
      owedToId: '',
      owedTo: '',
      percent: 0
    },
    royaltyList: []
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

  menuItemClick = (user) => {
    this.setState({ openMenu: false });
    this.setState({coOwner: {...this.state.coOwner, owedToId: user.id, owedTo: user.firstName}});
  }

  percentInput = (e) => {
    let percentSum: number = 0;
    if(parseFloat(e.target.value) <= 0 || parseFloat(e.target.value) > 100) {e.target.value = '0'; return};
    if(this.state.royaltyList.length > 0) {
      let percentSum = this.state.royaltyList.reduce((acc, owner) => acc + owner.percent, 0);
      if ((parseFloat(e.target.value) + percentSum) > 100) {
        e.target.value = '0';
        return;
      }
    }
    this.setState({coOwner: {...this.state.coOwner, percent: Math.floor(parseFloat(e.target.value)*100)/100 }})
  }

  addCoOwner = (e) => {
    if(this.state.coOwner.owedToId && this.state.coOwner.percent > 0) {
      this.state.royaltyList.push(this.state.coOwner)
      this.setState({coOwner: {...this.state.coOwner, owedToId: '', owedTo: '', percent: 0}})
      this.props.onFormChange('royalties', this.state.royaltyList)
      console.log(this.state.royaltyList)
    }

    let percentSum: number = 0
    if(this.state.royaltyList.length > 0) {
      percentSum = this.state.royaltyList.reduce((acc, owner) => acc + owner.percent, 0);
    }
    if ((percentSum) === 100) {
      this.setState({ openMenu: false, menuAnchor: e.target })
      return;
    } else {
      this.setState({ openMenu: true, menuAnchor: e.target })
    }
  }

  submitNewNft = (dataNft: INFTData) => {
    let patches = diff((this as any).props.orignalNftForm, dataNft, jsonPatchPathConverter);

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

    this.rpc['marketplace:patchNFT']((this as any).props.orignalNftForm._id, patches as any)
      .then((res) => {
        console.log('response', res)
        this.handleError('NFT created', 'success')
        // this.props.router.push('/profile')
      })
      .catch(this.handleError)
  }
  updatePricingForm(e: SubmitEvent): void {
    e.preventDefault();
    let nftForm = {...this.props.nftForm, listOn: this.scheduleDateTime()}
    if(!nftForm.nftItem) {
      console.log('please add NFT item')
    } else {
      this.submitNewNft(nftForm)
      console.log('API request data', nftForm)
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
                                   else {this.setState({ showScheduleInputs : true })}; this.scheduleDateTime()}
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

            <div><h2>Royalties</h2></div>
            {nftForm.royalties ? nftForm.royalties.map((ownerObj, idx) => (
              <div key={idx}>
                <div>{ownerObj.owedTo}</div>
                <div>{ownerObj.percent}</div>
              </div>
            )) : ''}
            {this.state.coOwner.owedTo ? (
              <div key={this.state.coOwner.owedToId}>
                <div>{this.state.coOwner.owedTo}</div>
                  <TextField onChange={this.percentInput} value={this.state.coOwner.percent} required={true} type="number" InputProps={{ inputProps: {min: 0, max: 100} }} className={'form-input'}  variant={"filled"} name={"percent"} label="percent" />
              </div>
              ) : ''}
            <div onClick={this.addCoOwner} className={styles.addRoyalty}>
              <AddCircleIcon />
              <h2>Add Co-owner</h2>
            </div>
            <div>
              <Menu
              anchorEl={this.state.menuAnchor}
              open={this.state.openMenu}
              onClose={() => this.setState({ openMenu: false })}>
                {dummyUserList.map((user) =>  <MenuItem key={user.id} onClick={this.menuItemClick.bind(this, user)}>{user.firstName}</MenuItem>)}
              </Menu>
            </div>

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

export const dummyUserList = [
  {id: 1, firstName: 'Matt Nilson', wallet: 'asdf1234'},
  {id: 2, firstName: 'John Howard', wallet: 'asdf1234'},
  {id: 3, firstName: 'Alan Wagner', wallet: 'asdf1234'},
  {id: 4, firstName: 'Eva Williams', wallet: 'asdf1234'},
  {id: 5, firstName: 'Alice Starshak', wallet: 'asdf1234'},
  {id: 6, firstName: 'Steven Dee', wallet: 'asdf1234'},
  {id: 7, firstName: 'Louis Demetry', wallet: 'asdf1234'}
]
