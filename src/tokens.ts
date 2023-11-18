import * as fs from 'fs';
import * as path from 'path';

const arbTokensFile = path.join(__dirname, "../data/arb.json");
let arbTokens: Token[] | undefined = undefined;

export class Token {
    symbol: string;
    name: string;
    address: string;

    constructor(symbol: string, name: string, address: string) {
        this.symbol = symbol;
        this.name = name;
        this.address = address;
    }
}

export async function getTokens(): Promise<Token[]> {
    if (arbTokens) {
        return arbTokens;
    }

    let content = JSON.parse(await fs.promises.readFile(arbTokensFile, 'utf8'));
    let tokens = content['tokens'];

    return tokens.map((token: any) => new Token(token["symbol"], token["name"], token["address"]));
}