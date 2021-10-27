import Head from 'next/head';
import { withRouter } from 'next/router';
import SessionComponent, {SessionComponentProps, SessionComponentState} from './common/_session-component';
import MarketplaceLogo from './common/_logo';

import styles from './../styles/index.module.css';


type IndexState = SessionComponentState&{
}
type IndexProps = SessionComponentProps&{
}

export class Index extends SessionComponent<IndexProps,IndexState> {
  wait: NodeJS.Timer | undefined;

  componentDidMount() {
    this.wait = setInterval(
      () => this.props.router.push('/login'), 500
    )
  }

  componentWillUnmount() {
    clearInterval(this.wait)
  }

  render() {
    return (
      <div className={styles.container}>
        <Head>
          <title>The Third Act</title>
          <meta name="description" content="Theater NFT marketplace platform" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        <div className={styles.wrapper}>
          <div className={styles.logo}>
            <MarketplaceLogo />
          </div>
        </div>
      </div>
    )
  }
}

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Index.getSession(context);

  return {
    props: {
      session
    }
  }
}

export default withRouter(Index)
