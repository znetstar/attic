import '../styles/globals.scss'
import '@fontsource/roboto'
import "@fontsource/poppins"
import type { AppProps } from 'next/app'
import { Provider } from 'next-auth/client'
import { createTheme, adaptV4Theme, ThemeProvider } from '@mui/material/styles';
import {Fragment} from "react";
import Head from 'next/head'

const theme = createTheme(adaptV4Theme({
  palette: {
    // @ts-ignore
    type: 'dark',
    primary: {
      main: '#878787',
    },
    secondary: {
      main: '#363944',
    }
  },
}));

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Fragment>
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
      </Head>
      <ThemeProvider theme={theme}>
        <Provider session={pageProps.session}>
          <Component {...pageProps} />
        </Provider>
      </ThemeProvider>
    </Fragment>
  );
}
export default MyApp
