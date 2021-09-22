import styles from './../../../styles/user-nft-pages-subComponents-styles/createHeader.module.css'

type headerProps = {
  stepNum: number
}

export function CreateNFTHeader({ stepNum }: headerProps) {

    return (
      <div className={styles.header_wrapper}>
        <div className={styles.heading}>Create Your NFT</div>
        <div className={styles.steps}>
          <div>Asset</div>
          <div>Pricing</div>
          <div>Launch</div>
        </div>
        <div className={styles.sticksNDots}>
          <div className={styles.dots}></div>
          <div className={styles.sticks}></div>
          <div className={styles.dots}></div>
          <div className={styles.sticks}></div>
          <div className={styles.dots}></div>
        </div>
      </div>
    )
}

export default CreateNFTHeader;