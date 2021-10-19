import Head from 'next/head';
import styles from '../styles/Home.module.css';
import {NFTHome} from './common/_nftHome';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>The Third Act</title>
        <meta name="description" content="Theater NFT marketplace platform" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
      <NFTHome />
      </main>
    </div>
  )
}
