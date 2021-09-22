import React, {ChangeEvent, PureComponent} from "react";
import { Button, FormControl, TextField, Switch } from "@material-ui/core";

import { INFTData } from "./../_ntf-collection";
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-assetForm.module.css"
import { FlowNode } from "typescript";

interface NftAssetProps {
  nftForm: INFTData;
  updateAssetForm: Function;
  onFormChange: Function;
}

/**
 * Allows the user to upload NFT Asset MetaData
 */
export class NFTAssetForm extends PureComponent<NftAssetProps> {

  constructor(props: NftAssetProps) {
    super(props);
  }

  componentDidMount() {
    console.log(this)
  }

  /**
   * Called when the nft file is Added
   * @param e
   */
  onNftAssetAdd(e: ChangeEvent<any>): void {
    e.preventDefault();
  }

  render() {
    const { nftForm, updateAssetForm, onFormChange } = this.props
    return (
      <div className={styles.nftForm_wrapper}>
        <form onSubmit={(e) => { updateAssetForm(); e.preventDefault(); }}>
           <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { console.log(nftForm, e.currentTarget.name, e.currentTarget.value); onFormChange(e.target.name, e.target.value) }} value={nftForm.title}  required={true} className={'form-input'}  variant={"filled"} name={"title"} label="Title" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { console.log(nftForm, e.currentTarget.name, e.currentTarget.value); onFormChange(e.target.name, e.target.value) }} value={nftForm.description}  required={false} className={'form-input'}  variant={"filled"} name={"description"} label="Description" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { console.log(nftForm, e.currentTarget.name, e.currentTarget.value); onFormChange(e.target.name, e.target.value) }} value={nftForm.tags} required={false} className={'form-input'}  variant={"filled"} name={"tags"} label="Show tags" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { console.log(nftForm, e.currentTarget.name, Math.floor(parseInt(e.currentTarget.value))); onFormChange(e.target.name, Math.floor(parseInt(e.currentTarget.value))) }} value={nftForm.supply} type="number" required={true} className={'form-input'}  variant={"filled"} name={"supply"} label="Supply" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <Switch defaultChecked onChange={(e) => console.log(nftForm)}/>
              </FormControl>
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

export default NFTAssetForm



{/* <form onSubmit={(e) => { this.updateAssetForm(); e.preventDefault(); }}>
<div>
   <FormControl className={'form-control'}>
     <TextField onChange={(e) => { nftForm.title = e.currentTarget.value; this.forceUpdate(); }} value={nftForm.title}  required={true} className={'form-input'}  variant={"filled"} name={"title"} label="Title" />
   </FormControl>
 </div>
 <div>
   <FormControl className={'form-control'}>
     <TextField onChange={(e) => { nftForm.description = e.currentTarget.value; this.forceUpdate(); }} value={nftForm.description}  required={false} className={'form-input'}  variant={"filled"} name={"description"} label="Description" />
   </FormControl>
 </div>
 <div>
   <FormControl className={'form-control'}>
     <TextField onChange={(e) => { nftForm.tags = [...e.currentTarget.value.split(' ')]; this.forceUpdate(); }} value={nftForm.tags} required={false} className={'form-input'}  variant={"filled"} name={"tags"} label="Show tags" />
   </FormControl>
 </div>
 <div>
   <FormControl className={'form-control'}>
     <TextField onChange={(e) => { nftForm.supply = Math.floor(parseInt(e.currentTarget.value)); this.forceUpdate(); console.log(nftForm)}} value={nftForm.supply} type="number" required={true} className={'form-input'}  variant={"filled"} name={"supply"} label="Supply" />
   </FormControl>
 </div>
 <div>
   <FormControl className={'form-control'}>
     <Switch defaultChecked onChange={(e) => { nftForm.nftFor = (this.state.nftForm.nftFor === 'sale') ? 'auction' : 'auction'}}/>
   </FormControl>
 </div>
 <div>
 <FormControl className={'form-control'}>
     <Button style={{ width: '50%' }} type={"button"} variant="contained" color="primary">
       Back
     </Button>
   </FormControl>
   <FormControl className={'form-control'}>
     <Button style={{ width: '50%' }} type={"submit"} variant="contained" color="primary">
       Next
     </Button>
   </FormControl>
 </div>
</form> */}