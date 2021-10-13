export async function getServerSideProps(context: any) {
  return {
    redirect: {
      destination: `/wallet/transactions`,
      permanent: false
    }
  }
}

export function blank () {
  return null;
}

export default blank;

