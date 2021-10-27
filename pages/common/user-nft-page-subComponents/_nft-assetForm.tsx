import React, {PureComponent} from "react";
import {Button, FormControl, Switch, TextField, Typography} from "@mui/material";
import  { TokenType, TokenSupplyType } from '../_rpcCommon';
import {INFT} from "../_nft";
import styles from "./../../../styles/user-nft-pages-subComponents-styles/nft-assetForm.module.css";

interface NftAssetProps {
  nftForm: INFT & { supply: number };
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

  get isLocked(): boolean {
    return Boolean(this.props.nftForm.tokenId);
  }

  render() {
    const { nftForm, updateAssetForm, onFormChange } = this.props
    return (
      <div className={styles.nftForm_wrapper}>
        <form onSubmit={(e) => { updateAssetForm(); e.preventDefault(); }}>
          {
            this.isLocked ? (
              <div >
                <FormControl className={'form-control'}>
                  <TextField disabled={this.isLocked}  onChange={(e) => { onFormChange(e.target.name, e.target.value) }} value={nftForm.tokenIdStr}  required={true} className={'form-input'}  variant={"filled"} name={"tokenIdStr"} label="Token ID" />
                </FormControl>
              </div>
            ) :  null
          }
           <div>
              <FormControl className={'form-control'}>
                <TextField disabled={this.isLocked}  onChange={(e) => { onFormChange(e.target.name, e.target.value) }} value={nftForm.name}  required={true} className={'form-input'}  variant={"filled"} name={"name"} label="Name" />
              </FormControl>
            </div>
          <div>
            <FormControl className={'form-control'}>
              <TextField disabled={this.isLocked}  required={true} onChange={(e) => { onFormChange(e.target.name, e.target.value.toUpperCase().replace( /[^A-Z\d]+/g, '' )) }} value={nftForm.symbol}  required={true} className={'form-input'}  variant={"filled"} name={"symbol"} inputProps={ { pattern: '[A-Z\\d]+' } } label="Symbol" />
            </FormControl>
          </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { onFormChange(e.target.name, e.target.value) }} value={nftForm.description}  required={false} className={'form-input'}  variant={"filled"} name={"description"} label="Description" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { let tags = e.target.value.split(' '); onFormChange(e.target.name, tags) }} value={nftForm.tags ? nftForm.tags.join(' ') : nftForm.tags} required={false} className={'form-input'}  variant={"filled"} name={"tags"} label="Show tags" />
              </FormControl>
            </div>
            <div>
              <FormControl className={'form-control'}>
                <TextField onChange={(e) => { if(parseInt(e.target.value) < 1) {e.target.value = '1'; return}; onFormChange(e.target.name, Math.floor(parseInt(e.target.value))) }} value={nftForm.supply} required={true} type="number" InputProps={{ inputProps: {min: 1} }} className={'form-input'}  variant={"filled"} name={"supply"} label="Supply" />
              </FormControl>
            </div>
          <div>
            <FormControl className={styles.formSwitch}>
              <Typography>Infinite</Typography>
              <Switch disabled={this.isLocked}  value={this.props.nftForm.supplyType === TokenSupplyType.finite ? TokenSupplyType.finite  : TokenSupplyType.infinite} onChange={(e) => {let nftFor = (e.target.checked ? TokenSupplyType.finite : TokenSupplyType.infinite); onFormChange(e.target.name, nftFor)}} className={'form-input'} name={"supplyType"} />
              <Typography>Finite</Typography>
            </FormControl>
          </div>
          {
            this.props.nftForm.supplyType === TokenSupplyType.finite ? (
              <div>
                <FormControl className={'form-control'}>
                  <TextField disabled={this.isLocked}  onChange={(e) => { if(parseInt(e.target.value) < 1) {e.target.value = '1'; return}; onFormChange(e.target.name, Math.floor(parseInt(e.target.value))) }} value={nftForm.maxSupply} required={true} type="number" InputProps={{ inputProps: {min: 1} }} className={'form-input'}  variant={"filled"} name={"maxSupply"} label="Max Supply" />
                </FormControl>
              </div>
            ) : null
          }
            <div>
              <FormControl className={styles.formSwitch}>
                <Typography>Sale</Typography>
                <Switch onChange={(e) => {let nftFor = e.target.checked ? 'auction' : 'sale'; onFormChange(e.target.name, nftFor)}} className={'form-input'} name={"nftFor"} />
                <Typography>Auction</Typography>
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
