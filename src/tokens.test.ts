import { getTokens, Token } from "./tokens";

test('read file', async () => {
    let tokens: Token[] = await getTokens();

    expect(tokens.length).toBeGreaterThan(100);
});
