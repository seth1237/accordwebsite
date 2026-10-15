export type CustomerAccount = {
  id: string
  name: string
  facilityName: string
  phone: string
  location: string
  createdAt: string
  lastSeenAt?: string
}

export type CustomerInterestProduct = {
  productId: string
  name: string
  slug: string
  categoryName: string
  clicks: number
  carts: number
  lastAt: string
}

export type CustomerPurchaseProduct = {
  productId: string
  name: string
  slug: string
  quantity: number
  lastBoughtAt: string
}

export type ClientInterestRow = {
  account: CustomerAccount
  viewed: CustomerInterestProduct[]
  bought: CustomerPurchaseProduct[]
}
