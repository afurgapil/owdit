const comments: any[] = [];
const votes = new Map<string, any>();

const buildQueryResult = (query: any) => {
	let arr = comments.slice();
	if (query) {
		if (query.parentId && query.parentId.$exists === false) {
			arr = arr.filter((c) => !c.parentId);
		}
		if (typeof query.parentId === "string") {
			arr = arr.filter((c) => c.parentId === query.parentId);
		}
		if (query["moderation.status"]) {
			arr = arr.filter((c) => c.moderation?.status === query["moderation.status"]);
		}
		if (query.contractAddress?.$regex) {
			const re = new RegExp(query.contractAddress.$regex, query.contractAddress.$options || "");
			arr = arr.filter((c) => re.test(c.contractAddress));
		}
		if (typeof query.chainId === "number") {
			arr = arr.filter((c) => c.chainId === query.chainId);
		}
	}
	return arr;
};

const commentsCol = {
	insertOne: async (doc: any) => { comments.push(doc); return { insertedId: doc._id }; },
	updateOne: async ({ _id }: any, update: any) => {
		const idx = comments.findIndex((c) => c._id === _id);
		if (idx >= 0) {
			comments[idx] = { ...comments[idx], ...(update.$set || {}) };
			if (typeof update.$inc?.repliesCount === "number") {
				comments[idx].repliesCount = (comments[idx].repliesCount || 0) + update.$inc.repliesCount;
			}
			if (typeof update.$inc?.score === "number") {
				comments[idx].score = (comments[idx].score || 0) + update.$inc.score;
			}
			return { modifiedCount: 1 };
		}
		return { modifiedCount: 0 };
	},
	deleteOne: async ({ _id }: any) => {
		const before = comments.length;
		const left = comments.filter((c) => c._id !== _id);
		comments.splice(0, comments.length, ...left);
		return { deletedCount: before - left.length };
	},
	findOne: async (query: any) => {
		if (query._id) return comments.find((c) => c._id === query._id) || null;
		return null;
	},
	find: (query: any) => {
		const base = buildQueryResult(query);
		return {
			sort: (_s: any) => ({
				skip: (n: number) => ({
					limit: (l: number) => ({ toArray: async () => base.slice(n, n + l) }),
				}),
				toArray: async () => base,
			}),
			toArray: async () => base,
		};
	},
	countDocuments: async (query: any) => buildQueryResult(query).length,
	createIndex: async () => {},
} as any;

const votesCol = {
	findOne: async (query: any) => {
		if (query._id) return votes.get(query._id) || null;
		if (query.commentId && query.voter) {
			const key = `${query.commentId}:${String(query.voter).toLowerCase()}`;
			return votes.get(key) || null;
		}
		return null;
	},
	insertOne: async (doc: any) => { votes.set(doc._id, doc); return { insertedId: doc._id }; },
	updateOne: async ({ _id }: any, { $set }: any) => { votes.set(_id, { ...(votes.get(_id) || {}), ...$set }); return { modifiedCount: 1 }; },
	deleteOne: async ({ _id }: any) => ({ deletedCount: votes.delete(_id) ? 1 : 0 }),
	createIndex: async () => {},
} as any;

class MockClient {
	connect = async () => undefined;
	db = () => ({ collection: (name: string) => (name === "community_comments" ? commentsCol : votesCol) });
	close = async () => undefined;
}

export class MongoClient extends (MockClient as { new(...args: any[]): any }) {}
export type Db = any;
export type Collection<T> = any;
export type Document = any;
