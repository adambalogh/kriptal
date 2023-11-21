import { Token, getToken } from "./tokens";
const qs = require('qs');

const EXCHANGE_URL = "https://arbitrum.api.0x.org";

export class Trade {
    sellTokenAddr: string;
    sellAmount: string;
    buyTokenAddr: string;
    buyAmount: string;

    constructor(sellTokenAddr: string, sellAmount: string, buyTokenAddr: string, buyAmount: string) {
        this.sellTokenAddr = sellTokenAddr;
        this.sellAmount = sellAmount;
        this.buyTokenAddr = buyTokenAddr;
        this.buyAmount = buyAmount;
    }

    static fromJson(obj: any): Trade {
        return new Trade(obj.sellTokenAddr, obj.sellAmount, obj.buyTokenAddr, obj.buyAmount);
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

    return new Trade(
        sell.address,
        price['sellAmount'],
        buy.address,
        price['buyAmount']);
}