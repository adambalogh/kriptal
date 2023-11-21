import { kv } from "@vercel/kv";
import { Trade } from "./exchange";

const TEN_MINUTES = 10 * 60;

export async function storeTrade(key: string, trade: Trade) {
    let result = await kv.set(key, JSON.stringify(trade), { ex: TEN_MINUTES });
    console.log(`Saved key ${key}`);
}

export async function getTrade(key: string): Promise<Trade | null> {
    let blob = await kv.get<string>(key);
    if (!blob) {
        return null;
    }

    return Trade.fromJson(JSON.parse(blob));
}