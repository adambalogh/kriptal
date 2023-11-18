import { OpenAI } from "openai";
import { Telegraf } from "telegraf";
import * as _ from 'highland';
import { assert } from "console";


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

	let runStatus = await openai.beta.threads.runs.retrieve(
		thread.id,
		run.id
	);

	while (runStatus.status !== 'requires_action' && runStatus.status !== 'completed') {
		sleep(1000);
		console.log(runStatus.status);

		runStatus = await openai.beta.threads.runs.retrieve(
			thread.id,
			run.id
		);
	}

	if (runStatus.status === 'requires_action') {
		let action = runStatus.required_action!;
		action.submit_tool_outputs.tool_calls.forEach(call => {
			console.log(call);
		});

	} else if (runStatus.status === 'completed') {
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
	}

	return ['unknown'];
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}


bot.launch();

console.log("Bot started");

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));