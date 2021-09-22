import React, {PureComponent} from "react";
import { Button, FormControl, RadioGroup, Radio, FormControlLabel, TextField, InputAdornment } from "@material-ui/core";

import { INFTData } from "./../_ntf-collection";
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-pricingForm.module.css"

interface NftPricingProps {
  nftForm: INFTData;
  updatePricingForm: Function;
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
    scheduleTime: ''
  }

  componentDidMount() {
    let currTime = new Date();
    console.log(currTime)
  }

  render() {
    const { nftForm, updatePricingForm, onFormChange } = this.props
    return (
      <div className={styles.nftForm_wrapper}>
        <form onSubmit={(e) => { updatePricingForm(); e.preventDefault(); }}>
            <div>
            <FormControl className={'form-control'}>
              <RadioGroup
                aria-label="listing"
                defaultValue="listOnSubmit"
                name="listOn"
                onChange={(e) => {if(e.target.value === 'listOnSubmit') {
                                    onFormChange(e.target.name, new Date()); 
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
                            <TextField onChange={(e) => { this.setState({ scheduleDate: e.target.value}); if(this.state.scheduleDate && this.state.scheduleTime) {onFormChange(e.target.name, this.state.scheduleDate.concat(this.state.scheduleTime))} }} value={nftForm.listOn} required={true} className={'form-input'}  variant={"filled"} name={"listOn"} label="Date" type="date" />
                          </FormControl>
                          <FormControl className={'form-control'}>
                            <TextField onChange={(e) => { this.setState({ scheduleTime: e.target.value}); if(this.state.scheduleDate && this.state.scheduleTime) {onFormChange(e.target.name, this.state.scheduleDate.concat(this.state.scheduleTime))} }} value={nftForm.listOn}  required={true} className={'form-input'}  variant={"filled"} name={"listOn"} label="Time" type="time" />
                          </FormControl>
                        </div>
            ) : ''}

            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { onFormChange(e.target.name, Math.floor(parseFloat(e.target.value)*100)/100) }} value={nftForm.priceStart} required={false} className={'form-input'}  variant={"filled"} name={"priceStart"} label="Starting Price" InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { inputMode: "numeric", pattern: "/^[+]?([0-9]+(?:[\.][0-9]*)?|\.[0-9]+)$/"}}}/>
              </FormControl>
            </div>

            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { if(parseInt(e.target.value) < 0) {e.target.value = '0'; return}; onFormChange(e.target.name, Math.floor(parseFloat(e.target.value)*100)/100) }} value={nftForm.priceBuyNow} required={false} type="number" className={'form-input'}  variant={"filled"} name={"priceBuyNow"} label="Buy Now Price" InputProps={{startAdornment: <InputAdornment position="start">$</InputAdornment>, inputProps: { min: 0}}} />
              </FormControl>
            </div>

            <div><h2>Royalties</h2></div>
            

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
