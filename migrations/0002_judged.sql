-- Who decided an entry's tags: 'keywords' when stored, 'model' once judged.
ALTER TABLE entries ADD COLUMN tagged_by TEXT NOT NULL DEFAULT 'keywords';
ALTER TABLE entries ADD COLUMN judged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE memories ADD COLUMN tagged_by TEXT NOT NULL DEFAULT 'keywords';
ALTER TABLE memories ADD COLUMN judged INTEGER NOT NULL DEFAULT 0;

CREATE INDEX entries_unjudged ON entries (at) WHERE judged = 0;
CREATE INDEX memories_unjudged ON memories (first_seen) WHERE judged = 0;
