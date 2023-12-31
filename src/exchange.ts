import { getToken } from "./tokens";
import { Token, Trade } from "./model";
const qs = require('qs');

const EXCHANGE_URL = "https://arbitrum.api.0x.org";


export async function getTrade(address: string, sell: string, buy: string, sellAmount: number): Promise<Trade | string> {
    const sellToken = await getToken(sell);
    const buyToken = await getToken(buy);

    if (sellToken === undefined) {
        return `Token ${sell} not found in list`;
    }
    if (buyToken === undefined) {
        return `Token ${buy} not found in list`;
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

    return new Trade(
        sell,
        buy,
        price['sellAmount'],
        price['buyAmount']);
}