import { OpenAI } from "openai";
import { Telegraf } from "telegraf";
import * as _ from 'highland';
import { ethers } from "ethers";
import { Alchemy, Network, Utils } from 'alchemy-sdk';
import { getTrade } from "./exchange";
import { coinBaseWalletUrl } from "./wallet";


const settings = {
	apiKey: process.env.ALCHEMY_KEY!,
	network: Network.ARB_MAINNET 
};
  
const alchemy = new Alchemy(settings);

const privateKey: string = process.env.PRIVATE_KEY!;
const ETH_RPC: string = "https://arbitrum.llamarpc.com";

const provider = new ethers.JsonRpcProvider(ETH_RPC);
const wallet = new ethers.Wallet(privateKey, provider);

const openai = new OpenAI({
	apiKey: process.env.OPENAI_API_KEY!
});
const bot: Telegraf = new Telegraf(process.env.TELEGRAM_BOT_KEY!);

const threads: Map<string, OpenAI.Beta.Threads.Thread> = new Map();
let assistant: any | undefined = undefined;

async function getAssistant() {
	if (assistant != undefined) {
		return assistant;
	}

	assistant = await openai.beta.assistants.retrieve(process.env.OPENAI_ASSISTANT_ID!);
	console.log("Assistant Initialized");

	return assistant;
}

async function getThread(userId: string): Promise<OpenAI.Beta.Threads.Thread> {
	const existingThread = threads.get(userId);
	if (existingThread) {
		return existingThread;
	}

	let thread = await openai.beta.threads.create();
	threads.set(userId, thread);

	return thread;
}

bot.start((ctx) => ctx.reply('Welcome to KriptAl'));

bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('message', async (ctx) => {
	console.log(ctx.message);

	ctx.sendChatAction("typing");

	if ("text" in ctx.message) {
		let msg = ctx.message.text;
		let responses = await handleMessage(`user-{ctx.message.from.id}`, msg);

		responses.forEach(msg => ctx.reply(msg));
	} else {
		ctx.reply("🤓");
	}
});

async function handleMessage(userId: string, msg: string): Promise<string[]> {
	let assistant = await getAssistant();
	let thread = await getThread(userId);

	await openai.beta.threads.messages.create(thread.id, {
		role: "user",
		content: msg
	});

	const run = await openai.beta.threads.runs.create(thread.id, {
		assistant_id: assistant.id,
		instructions: msg
	});

	return processRun(thread, run);
}

async function processRun(thread: OpenAI.Beta.Threads.Thread, run: OpenAI.Beta.Threads.Run): Promise<string[]> {
	while (run.status !== 'requires_action' && run.status !== 'completed') {
		sleep(1000);
		console.log(run.status);

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

				const trade = await getTrade(
					wallet.address,
					sell,
					buy,
					args['amount'])

				return {
					tool_call_id: call.id,
					output: `Execute trade by clicking on "${coinBaseWalletUrl("google.com")}"`
				};

			} else if (call.function.name === 'get_user_tokens') {
				let tokenBalances = await alchemy.core.getTokenBalances(wallet.address);
				console.log(tokenBalances);

				let balances = await Promise.all(tokenBalances.tokenBalances
					.filter(balance => Utils.formatEther(balance.tokenBalance || "") !== "0.0")
					.map(async balance => {
						let metadata = await alchemy.core.getTokenMetadata(balance.contractAddress);
						return `${metadata.name}: ${truncate(Utils.formatEther(balance.tokenBalance || ""))}`;
					}));

				let ethBalance = Utils.formatEther(await alchemy.core.getBalance(wallet.address));
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

		return processRun(thread, run);
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

		return assistantMessages.reverse();

	} else {
		return ['error'];
	}
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function truncate(amount: string): string {
	let number = Number.parseFloat(amount);
	return number.toFixed(5).toString();
}

bot.catch(err => {
	console.log(err);
	throw err;
});

bot.launch();

console.log("Bot started");

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));