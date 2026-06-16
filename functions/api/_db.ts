// Cloudflare D1 database helper

export interface D1Env {
  DB: D1Database;
}

export function createD1Adapter(db: D1Database) {
  return {
    async prepare(sql: string) {
      const stmt = db.prepare(sql);
      return {
        async all(...params: any[]) {
          const result = await stmt.bind(...params).all();
          return result.results || [];
        },
        async get(...params: any[]) {
          return stmt.bind(...params).first();
        },
        async run(...params: any[]) {
          return stmt.bind(...params).run();
        },
      };
    },
  };
}
