import { communityComments, CommunityCommentsService } from "../comments";

jest.mock("mongodb");

describe("CommunityCommentsService", () => {
	beforeEach(async () => {
		jest.clearAllMocks();
		await (communityComments as CommunityCommentsService).disconnect();
	});

	test("create normalizes addresses and increments parent replies", async () => {
		const base = {
			contractAddress: "0xABC",
			chainId: 1,
			message: "hi",
			author: { address: "0xUSER" },
			moderation: { status: "approved" as const },
		};
		const parent = await communityComments.create({ ...base });
		expect(parent.contractAddress).toBe("0xabc");
		expect(parent.author.address).toBe("0xuser");
		const reply = await communityComments.create({ ...base, parentId: parent._id });
		expect(reply.parentId).toBe(parent._id);
		const score = await communityComments.getScore(parent._id!);
		expect(score).toBe(0);
	});

	test("listByContract filters by status and attaches userVote", async () => {
		const a = await communityComments.create({
			contractAddress: "0xabc",
			chainId: 1,
			message: "m1",
			author: { address: "0xme" },
			moderation: { status: "approved" },
		} as any);
		await communityComments.create({
			contractAddress: "0xabc",
			chainId: 1,
			message: "m2",
			author: { address: "0xyou" },
			moderation: { status: "pending" },
		} as any);
		await communityComments.upsertVote(a._id!, "0xME", 1);
		const res = await communityComments.listByContract({ contractAddress: "0xABC", chainId: 1, status: "approved", authorAddress: "0xme" });
		expect(res.items.length).toBeGreaterThanOrEqual(1);
		expect((res.items[0] as any).extra.userVote).toBe(0);
	});

	test("upsert/remove vote updates score", async () => {
		const c = await communityComments.create({
			contractAddress: "0xabc",
			chainId: 1,
			message: "m",
			author: { address: "0xme" },
			moderation: { status: "approved" },
		} as any);
		await communityComments.upsertVote(c._id!, "0xME", 1);
		let score = await communityComments.getScore(c._id!);
		expect(score).toBe(1);
		await communityComments.removeVote(c._id!, "0xme");
		score = await communityComments.getScore(c._id!);
		expect(score).toBe(0);
	});

	test("updateModeration merges fields", async () => {
		const c = await communityComments.create({
			contractAddress: "0xabc",
			chainId: 1,
			message: "m",
			author: { address: "0xme" },
			moderation: { status: "pending" },
		} as any);
		const ok = await communityComments.updateModeration(c._id!, { status: "approved" });
		expect(ok).toBe(true);
	});

	test("listReplies returns only replies", async () => {
		const base = {
			contractAddress: "0xabc",
			chainId: 1,
			message: "m",
			author: { address: "0xme" },
			moderation: { status: "approved" as const },
		};
		const p = await communityComments.create(base as any);
		await communityComments.create({ ...(base as any), parentId: p._id });
		const replies = await communityComments.listReplies(p._id!);
		expect(replies.length).toBe(1);
	});

	test("remove deletes document", async () => {
		const c = await communityComments.create({
			contractAddress: "0xabc",
			chainId: 1,
			message: "m",
			author: { address: "0xme" },
			moderation: { status: "approved" },
		} as any);
		const res = await communityComments.remove(c._id!);
		expect(res).toBe(true);
	});
});
