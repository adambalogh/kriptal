import * as fs from 'fs';
import * as path from 'path';
import { Token } from './model';

const arbTokensFile = path.join(__dirname, "../data/arb.json");
let arbTokens: Token[] | undefined = undefined;

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