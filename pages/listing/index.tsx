
export async function getServerSideProps(context: any) {
  return {
    redirect: {
      destination: `/`,
      permanent: false
    }
  }
}

export function blank () {
  return null;
}

export default blank;

