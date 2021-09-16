import '../styles/globals.scss'
import '@fontsource/roboto'
import "@fontsource/poppins"
import type { AppProps } from 'next/app'
import { Provider } from 'next-auth/client'

import {MuiThemeProvider, createTheme, ThemeProvider} from '@material-ui/core/styles';
import {Fragment} from "react";

const theme = createTheme({
  palette: {
    type: 'dark',
    primary: {
      main: '#878787',
    },
    secondary: {
      main: '#363944',
    }
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Fragment>
      <ThemeProvider theme={theme}>
        <Provider session={pageProps.session}>
          <Component {...pageProps} />
        </Provider>
      </ThemeProvider>
    </Fragment>
  );
}
export default MyApp
