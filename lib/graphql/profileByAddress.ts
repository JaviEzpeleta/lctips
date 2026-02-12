export const profileByAddress = `
  query GetProfilesByAddress($address: EvmAddress!) {
    profiles(request: { 
      where: {
        ownedBy: [$address]
      }}) {
      items {
        handle {
          fullHandle
        }
      }
    }
  }
`
