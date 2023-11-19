const COINBASE_WALLET_URL = "https://go.cb-w.com/dapp?cb_url=";

export function coinBaseWalletUrl(url: string): string {
    return COINBASE_WALLET_URL + encodeURI(url);
}