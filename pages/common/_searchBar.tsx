import React, {PureComponent} from "react";

interface SearchBarProps {
  searchMenu: [],
  onSelect: Function
}

/**
 * Allows the user to upload NFT Asset MetaData
 */
export class SearchBar extends PureComponent<SearchBarProps> {

  constructor(props: SearchBarProps) {
    super(props);
  }

  state = {
    selected: '',
    showList: false
  }

  componentDidUpdate (_prevProps: any, prevState: { selected: string; }) {
    if(this.state.selected !== prevState.selected) {
      this.props.onSelect(this.props.searchMenu.find(item => item.email === this.state.selected))
    }
  }

  handleChange = (e: { target: { value: any; }; }) => {
    if (!e.target.value) {
      this.setState({ selected: e.target.value, showList: false })
    } else {
      this.setState({ selected: e.target.value, showList: true })
    }
  }

  menuItemClick = (e: { target: { outerText: any; }; }) => {
    this.setState({ selected: e.target.outerText, showList: false })
  }

  render() {
    return(
      <div className="bar">
      <input type='search' placeholder='Producer email' onChange={this.handleChange} value={this.state.selected ? this.state.selected : ''} />
      {this.state.showList ? (
      <div className='search_list'>
          <ul>
            {this.props.searchMenu.filter(item => item.email ? item.email.includes(this.state.selected) : '').map((item,idx) => (
              <li key={idx} onClick={this.menuItemClick}>{item.email}</li>)
            )}
        </ul>
      </div>
      ) : ''}  
      </div>
    )
  }
}

  export default SearchBar