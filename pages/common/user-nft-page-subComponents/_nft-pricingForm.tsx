import React, {PureComponent} from "react";
import { Button, FormControl, RadioGroup, Radio, FormControlLabel, TextField, InputAdornment, Menu, MenuItem } from "@mui/material/";
import AddCircleIcon from '@mui/icons-material/AddCircle';

import { INFTData } from "./../_ntf-collection";
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-pricingForm.module.css"
import { style } from "@mui/system";
import { ConsoleLogger } from "typedoc/dist/lib/utils";

interface NftPricingProps {
  nftForm: INFTData;
  onFormChange: Function;
}

/**
 * Allows the user to upload NFT Pricing MetaData
 */
export class NFTPricingForm extends PureComponent<NftPricingProps> {

  constructor(props: NftPricingProps) {
    super(props);
  }

  state = {
    showScheduleInputs : false,
    scheduleDate: '',
    scheduleTime: '',
    openMenu: false,
    menuAnchor: null,
    coOwner: {
      owedToId: '',
      owedTo: '',
      percent: null
    },
    royaltyList: []
  }

  componentDidMount() {
    let currTime = new Date();
    console.log(currTime)
  }

  scheduleDateTime = () => {
    const currDate = new Date();
    console.log(this.state, currDate);
  }

  menuItemClick = (user) => {
    this.setState({ openMenu: false })
    this.setState({coOwner: {...this.state.coOwner, owedToId: user.id, owedTo: user.firstName}})
    console.log(this.state.coOwner)
  }

  percentInput = (e) => { 
    let percentSum = 0
    if(parseFloat(e.target.value) <= 0) {e.target.value = '0'; return};
    if(this.state.royaltyList.length > 0) {
      let percentSum = this.state.royaltyList.reduce((acc, owner) => acc + owner.percent, 0)
      if ((parseFloat(e.target.value) + percentSum) > 100) {
        console.log("total can't exceed 100");
        e.target.value = '0';
        return;
      }
    }
    this.setState({coOwner: {...this.state.coOwner, percent: Math.floor(parseFloat(e.target.value)*100)/100 }})
  }

  addCoOwner = (e) => {
    if(this.state.coOwner.owedToId) {
      this.state.royaltyList.push(this.state.coOwner)
      this.setState({coOwner: {...this.state.coOwner, owedToId: '', owedTo: '', percent: 0}})
      this.props.onFormChange('royalties', this.state.royaltyList)
      console.log(this.state.royaltyList)
    }
    this.setState({ openMenu: true, menuAnchor: e.target })
  }

  updatePricingForm = () => {
    this.scheduleDateTime();
    console.log('check and submit time!!!')
  }

  render() {
    const { nftForm, onFormChange } = this.props
    return (
      <div className={styles.nftForm_wrapper}>
        <form onSubmit={(e) => { this.updatePricingForm(); e.preventDefault(); }}>
            <div>
            <FormControl className={'form-control'}>
              <RadioGroup
                aria-label="listing"
                defaultValue="listOnSubmit"
                name="listOn"
                onChange={(e) => {if(e.target.value === 'listOnSubmit') {
                                    this.setState({ showScheduleInputs: false })} 
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
                            <TextField onChange={(e) => { this.setState({ scheduleDate: e.target.value});}} value={this.state.scheduleDate} required={true} className={'form-input'}  variant={"filled"} name={"listOnDate"} label="Date" type="date" />
                          </FormControl>
                          <FormControl className={'form-control'}>
                            <TextField onChange={(e) => { this.setState({ scheduleTime: e.target.value});}} value={this.state.scheduleTime}  required={true} className={'form-input'}  variant={"filled"} name={"listOnTime"} label="Time" type="time" />
                          </FormControl>
                        </div>
            ) : ''}

            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { if(parseFloat(e.target.value) < 0) {e.target.value = '0'; return}; onFormChange(e.target.name, Math.floor(parseFloat(e.target.value)*100)/100) }} value={nftForm.priceStart} required={false} type="number" className={'form-input'}  variant={"filled"} name={"priceStart"} label="Starting Price" InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0}}}/>
              </FormControl>
            </div>

            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { if(parseFloat(e.target.value) < 0) {e.target.value = '0'; return}; onFormChange(e.target.name, Math.floor(parseFloat(e.target.value)*100)/100) }} value={nftForm.priceBuyNow} required={false} type="number" className={'form-input'}  variant={"filled"} name={"priceBuyNow"} label="Buy Now Price" InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0}}} />
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

export default NFTPricingForm

export const dummyUserList = [
  {id: 1, firstName: 'abc', wallet: 'asdf1234'},
  {id: 2, firstName: 'def', wallet: 'asdf1234'},
  {id: 3, firstName: 'ghi', wallet: 'asdf1234'},
  {id: 4, firstName: 'jkl', wallet: 'asdf1234'},
  {id: 5, firstName: 'mno', wallet: 'asdf1234'},
  {id: 6, firstName: 'pqr', wallet: 'asdf1234'},
  {id: 7, firstName: 'stu', wallet: 'asdf1234'}
]
