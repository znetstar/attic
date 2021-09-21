import Box from "@mui/material/Box";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Typography from "@mui/material/Typography";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import PersonIcon from "@mui/icons-material/Person";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import SettingsIcon from "@mui/icons-material/Settings";
import * as React from "react";
import {Component, PureComponent} from "react";
import {SubcomponentProps} from "./_session-component";
import CloseIcon from "@mui/icons-material/Close";

export type AppBarProps =  SubcomponentProps&{
  rightSideOfAppbar: JSX.Element|null;
  pageTitle: string;
}
export type AppBarState =  {}

export class SettingsSidebar extends PureComponent<SubcomponentProps&{
  open: boolean,
  onClose: () => void,
  onProfileOpen:() => void;
}, {}> {
  render() {
   return (
      <Drawer
        anchor={'right'}
        open={this.props.open}
        onClose={this.props.onClose}
      >
        <List>
          {
            this.props.session ? (
              <React.Fragment>
                <ListItem key={'Profile'} onClick={() => this.props.onProfileOpen()}>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary={'Profile'} />
                </ListItem>
              </React.Fragment>
            ) : null
          }
        </List>
      </Drawer>
    )
  }
}

export class SettingsButton extends PureComponent<SubcomponentProps&{ open: boolean, onClose: () => void, onOpen: () => void, onProfileOpen: () => void }, { }> {
  public render() {
    return (
      <React.Fragment>
        <SettingsSidebar
          {...this.props}
          onProfileOpen={() => this.props.onProfileOpen()}
        ></SettingsSidebar>
        {
          !this.props.open ? (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="back"
              sx={{ mr: 2 }}
              onClick={this.props.onOpen}
            >
              <SettingsIcon />
            </IconButton>
          ) : (
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="back"
              sx={{ mr: 2 }}
              onClick={this.props.onClose}
            >
              <CloseIcon/>
            </IconButton>
          )
        }
      </React.Fragment>
    )
  }
}

export class MarketplaceAppBar extends PureComponent<AppBarProps, AppBarState> {
  render() {
    return (
      <React.Fragment>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <IconButton
                onClick={() => {
                  if (typeof(window) !== 'undefined')
                    window.history.back();
                }}
                size="large"
                edge="start"
                color="inherit"
                aria-label="back"
                sx={{ mr: 2 }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                {this.props.pageTitle}
              </Typography>
              {this.props.rightSideOfAppbar}
            </Toolbar>
          </AppBar>
        </Box>
      </React.Fragment>
    )
  }
}
