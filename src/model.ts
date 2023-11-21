import { BigNumber, Utils } from 'alchemy-sdk';


export class Token {
    symbol: string;
    name: string;
    address: string;
    decimals: number;

    constructor(symbol: string, name: string, address: string, decimals: number) {
        this.symbol = symbol;
        this.name = name;
        this.address = address;
        this.decimals = decimals;
    }

    public amount(amount: number): BigNumber {
        return BigNumber.from(10).pow(this.decimals).mul(amount);
    }

    public format(amount: string): string {
        return Utils.formatUnits(amount, this.decimals);
    }

    static fromJson(obj: any): Token {
        return new Token(obj.symbol, obj.name, obj.address, obj.decimals);
    }
}

export class Trade {
    sell: Token;
    buy: Token;
    sellAmount: string;
    buyAmount: string;

    constructor(sell: Token, buy: Token, sellAmount: string, buyAmount: string) {
        this.sell = sell;
        this.buy = buy;
        this.sellAmount = sellAmount;
        this.buyAmount = buyAmount;
    }

    static fromJson(obj: any): Trade {
        return new Trade(Token.fromJson(obj.sell), Token.fromJson(obj.buy), obj.sellAmount, obj.buyAmount);
    }
}