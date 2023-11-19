import { BigNumber, Utils } from 'alchemy-sdk';
import * as fs from 'fs';
import * as path from 'path';

const arbTokensFile = path.join(__dirname, "../data/arb.json");
let arbTokens: Token[] | undefined = undefined;

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
}

export async function getToken(symbol: string): Promise<Token | undefined> {
    const tokens = await getTokens();
    const upperCaseSymbol = symbol.toUpperCase();

    return tokens.find(token => token.symbol === upperCaseSymbol);
}

export async function getTokens(): Promise<Token[]> {
    if (arbTokens) {
        return arbTokens;
    }

    let content = JSON.parse(await fs.promises.readFile(arbTokensFile, 'utf8'));
    let tokens = content['tokens'];

    return tokens.map((token: any) => new Token(token["symbol"], token["name"], token["address"], token["decimals"]));
}