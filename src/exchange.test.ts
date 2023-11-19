import { getTrade } from "./exchange";

const USER_ADDRESS = "0xeffbdc84661F37BA85a1F951E5424cab8e89D28b";

test("Fetches price", async () => {
    const price = await getTrade(USER_ADDRESS, "LINK", "GRT", 10);

    expect(price.sellAmount).toBe("10.0");
    expect(Number.parseFloat(price.buyAmount)).toBeGreaterThan(100);
});