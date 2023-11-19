import { Token, getToken } from "./tokens";
const qs = require('qs');

const EXCHANGE_URL = "https://arbitrum.api.0x.org";

export class Trade {
    sellAmount: string;
    buyAmount: string;

    constructor(sellAmount: string, buyAmount: string) {
        this.sellAmount = sellAmount;
        this.buyAmount = buyAmount;
    }
}

export async function getTrade(address: string, sell: string, buy: string, sellAmount: number): Promise<Trade> {
    const sellToken = await getToken(sell);
    const buyToken = await getToken(buy);

    if (sellToken === undefined) {
        throw Error(`Token ${sell} not found`);
    }
    if (buyToken === undefined) {
        throw Error(`Token ${buy} not found`);
    }

    return getTradeImpl(address, sellToken, buyToken, sellAmount);
}

async function getTradeImpl(address: string, sell: Token, buy: Token, sellAmount: number): Promise<Trade> {
    const params = {
        sellToken: sell.address, 
        buyToken: buy.address, 
        sellAmount: sell.amount(sellAmount).toString(), 
        takerAddress: address, 
    };
    
    const headers = new Headers();
    headers.append('0x-api-key', process.env.ZEROX_API_KEY!);
    
    const response = await fetch(
        `${EXCHANGE_URL}/swap/v1/price?${qs.stringify(params)}`, {
            method: 'GET',
            headers: headers
        }
    ); 
    
    const price = await response.json();
    console.log(price);

    return new Trade(sell.format(price['sellAmount']), buy.format(price['buyAmount']));
}