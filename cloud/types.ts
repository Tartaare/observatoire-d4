import type {Fixture, MatchDocument, Standing, SyncStatus, Sheet} from '../server/collection-types.js';
export type {Fixture, MatchDocument, Standing};
export type Coverage = import('../src/types.js').Coverage;
export type Archive = Omit<MatchDocument, 'sheets'> & {
  sheets: (Sheet & {latestState: Sheet['state']})[];
};
export type State = SyncStatus & {
  stage: 'standings' | 'directory' | 'clubs' | 'matches' | 'finished';
  queue: string[]; standings: Standing[]; rounds: number; force: boolean;
  nextRequestAt: number; coverage: Coverage;
};
export type Snapshot = {fixtures: Fixture[]; matches: Archive[]};
export type CachedPage = {body: string; etag: string | null; modified: string | null; fetchedAt: string};
export type Commit = {state: State; fixtures?: Fixture[]; match?: Archive; page?: {url: string; data: CachedPage}};
export interface Store {
  state(season: number): Promise<State | null>;
  claim(season: number, start: boolean, force: boolean): Promise<{owner: string; state: State} | null>;
  commit(season: number, owner: string, change: Commit): Promise<void>;
  snapshot(season: number): Promise<Snapshot>;
  page(url: string): Promise<CachedPage | null>;
  member(userId: string): Promise<boolean>;
}
