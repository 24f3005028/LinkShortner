import { IDBPDatabase, openDB } from "idb";

import type { LinkRead } from "./types";

const DB_NAME = "snip-links";
const STORE_NAME = "links";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "code",
          });
          store.createIndex("created_at", "created_at");
        }
      },
    });
  }

  return dbPromise;
}

export async function saveLocalLink(link: LinkRead): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, link);
}

export async function getLocalLinks(): Promise<LinkRead[]> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.store;
  const all = await store.getAll();

  return all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function deleteLocalLink(code: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, code);
}

export async function clearLocalLinks(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}