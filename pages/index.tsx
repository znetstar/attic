import Head from 'next/head';
import { withRouter } from 'next/router';
import SessionComponent, {SessionComponentProps, SessionComponentState} from './common/_session-component';

import styles from './../styles/index.module.css';

type HomeState = SessionComponentState&{
}
type HomeProps = SessionComponentProps&{
}

export class Home extends SessionComponent<HomeProps,HomeState> {

  render() {
    return (
      <div className={styles.container}>
        <Head>
          <title>The Third Act</title>
          <meta name="description" content="Theater NFT marketplace platform" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        <main className={styles.main}>
        </main>
      </div>
    )
  }
}

export async function getServerSideProps(context: any) {
  const { res, req } = context;
  const session = await Home.getSession(context);

  return {
    props: {
      session
    }
  }
}

export default withRouter(Home)
