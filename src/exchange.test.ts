import { getExchange } from "./exchange";
import { getTokens } from "./tokens";

const USER_ADDRESS = "0x9540E559e170E8a817ce0F9f22969d592613Bc5a";

test("Fetches price", async () => {
    const tokens = await getTokens();

    const linkToken = tokens.find(token => token.symbol === "LINK")!;
    const grtToken = tokens.find(token => token.symbol === "GRT")!;

    const price = await getExchange(USER_ADDRESS, linkToken, grtToken, 10);

    expect(price.sellAmount).toBe("10.0");
    expect(Number.parseFloat(price.buyAmount)).toBeGreaterThan(100);
});