import {FormControl, Input, InputLabel, TextField} from "@material-ui/core";
import {PureComponent} from "react";

export interface LoginFormControlProps<V> {
  value: V|null;
  type: string;
  id: string;
  text: string;
  required: boolean|undefined;
}

export class LoginFormControl extends PureComponent<LoginFormControlProps<any>>  {
  constructor(props: LoginFormControlProps<any>) { super(props); }
  render() {
    // return (
    //   <FormControl className={'login-form-control'}>
    //     <InputLabel htmlFor={this.props.id}>{this.props.text}</InputLabel>
    //     <Input className={'login-form-input'} id={this.props.id} value={this.props.value} inputProps={{ name: this.props.id, type: this.props.type }} />
    //   </FormControl>
    // )
    return (
      <FormControl className={'form-control login-form-control'}>
        <TextField required={this.props.required || false} variant={"filled"} label={this.props.text} className={'form-input login-form-input'} type={this.props.type} id={this.props.id} value={this.props.value} name={this.props.id} />
      </FormControl>
    )
  }
}

export default LoginFormControl;
