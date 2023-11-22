import { OpenAI } from "openai";
import { Telegraf } from "telegraf";
import * as _ from 'highland';
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { getTrade } from "./exchange";
import { coinBaseWalletUrl } from "./wallet";
import { storeTrade } from "./storage";
import { v4 as uuidv4 } from 'uuid';


const ALCHEMY_SETTINGS = {
    apiKey: process.env.ALCHEMY_KEY!,
    network: Network.ARB_MAINNET 
};
 
const alchemy = new Alchemy(ALCHEMY_SETTINGS);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
});
const bot: Telegraf = new Telegraf(process.env.TELEGRAM_BOT_KEY!);

const address = process.env.ADDRESS!;

export class Bot {

    threads: Map<string, OpenAI.Beta.Threads.Thread>;
    assistant: any | undefined;

    constructor() {
        this.threads = new Map();
        this.assistant = undefined;
    }

    private async getAssistant() {
        if (this.assistant != undefined) {
            return this.assistant;
        }

        this.assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID!);
        console.log("Assistant Initialized");

        return this.assistant;
    }

    private async getThread(userId: string): Promise<OpenAI.Beta.Threads.Thread> {
        const existingThread = this.threads.get(userId);
        if (existingThread) {
            return existingThread;
        }

        let thread = await openai.beta.threads.create();
        this.threads.set(userId, thread);

        return thread;
    }

    public start() {
        bot.start((ctx) => ctx.reply('Welcome to KriptAl'));
        bot.help((ctx) => ctx.reply('Send me a sticker'));

        bot.on('message', async (ctx) => {
            console.log(ctx.message);

            ctx.sendChatAction("typing");

            if ("text" in ctx.message) {
                let msg = ctx.message.text;
                let responses = await this.handleMessage(`user-{ctx.message.from.id}`, msg);

                responses.forEach(msg => ctx.reply(msg));
            } else {
                ctx.reply("🤓");
            }
        });

        bot.catch(err => {
            console.log(err);
            throw err;
        });

        bot.launch();
    }

    public stop(reason: string) {
        bot.stop(reason);
    }

    private async handleMessage(userId: string, msg: string): Promise<string[]> {
        let assistant = await this.getAssistant();
        let thread = await this.getThread(userId);

        await openai.beta.threads.messages.create(thread.id, {
            role: "user",
            content: msg
        });

        const run = await openai.beta.threads.runs.create(thread.id, {
            assistant_id: assistant.id,
            instructions: msg
        });

        return this.processRun(thread, run);
    }

    private async processRun(thread: OpenAI.Beta.Threads.Thread, run: OpenAI.Beta.Threads.Run): Promise<string[]> {
        while (run.status !== 'requires_action' && run.status !== 'completed') {
            sleep(1000);
            run = await openai.beta.threads.runs.retrieve(
                thread.id,
                run.id
            );
        }

        if (run.status === 'requires_action') {
            let action = run.required_action!;
            let toolOutputs = await Promise.all(action.submit_tool_outputs.tool_calls.map(async call => {
                console.log(call);
                if (call.function.name === 'get_price') {
                    return {
                        tool_call_id: call.id,
                        output: '30000',
                    }
                } else if (call.function.name === 'swap_token') {
                    const args = JSON.parse(call.function.arguments);
                    const sell = args['from_token'];
                    const buy = args['to_token'];
                    const amount = args['amount'];

                    const trade = await getTrade(
                        address,
                        sell,
                        buy,
                        amount);

                    if (typeof trade === 'string') {
                        return {
                            tool_call_id: call.id,
                            output: `Error: ${trade}`
                        };
                    }

                    let tradeId = uuidv4();
                    await storeTrade(tradeId, trade);
                    let exchangeUrl = `https://kriptal-app.vercel.app/trade?id=${tradeId}`;

                    return {
                        tool_call_id: call.id,
                        output: `The user can swap ${trade.sellAmount} ${trade.sell.name} for ${trade.buyAmount} ${trade.buy.name} 
                        by clicking on this link that will take the user to his/her wallet (to a trusted website)
                        "${coinBaseWalletUrl(exchangeUrl)}"`
                    };

                } else if (call.function.name === 'get_user_tokens') {
                    let tokenBalances = await alchemy.core.getTokenBalances(address);
                    console.log(tokenBalances);

                    let balances = await Promise.all(tokenBalances.tokenBalances
                        .filter(balance => Utils.formatEther(balance.tokenBalance || "") !== "0.0")
                        .map(async balance => {
                            let metadata = await alchemy.core.getTokenMetadata(balance.contractAddress);
                            return `${metadata.name}: ${truncate(Utils.formatEther(balance.tokenBalance || ""))}`;
                        }));

                    let ethBalance = Utils.formatEther(await alchemy.core.getBalance(address));
                    balances.push(`ETH: ${truncate(ethBalance)}`);

                    console.log(balances);
                    
                    return {
                        tool_call_id: call.id,
                        output: balances.join("\n")
                    }
                } else {
                    return {};
                }
            }));

            run = await openai.beta.threads.runs.submitToolOutputs(
                thread.id,
                run.id,
                {tool_outputs: toolOutputs}
            );

            return this.processRun(thread, run);
        } else if (run.status === 'completed') {
            const threadMessages = await openai.beta.threads.messages.list(thread.id);

            const assistantMessages: string[] = [];
            for (let i = 0; i < threadMessages.data.length; i++) {
                if (threadMessages.data[i].role === 'user') {
                    break;
                }

                threadMessages.data[i].content.forEach(content => {
                    if (content.type === 'text') {
                        assistantMessages.push(content.text.value);
                    }
                })
            }

            console.log(assistantMessages.reverse());
            return assistantMessages.reverse();

        } else {
            return ['error'];
        }
    }

}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(amount: string): string {
	let number = Number.parseFloat(amount);
	return number.toFixed(5).toString();
}
