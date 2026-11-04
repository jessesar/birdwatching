-- Glimmers: tests an entry leans towards without being clearly about them,
-- plus the model's one-line reasoning and the words it took as evidence.
ALTER TABLE entries ADD COLUMN hints TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN reason TEXT NOT NULL DEFAULT '';
ALTER TABLE entries ADD COLUMN quote TEXT NOT NULL DEFAULT '';
ALTER TABLE memories ADD COLUMN hints TEXT NOT NULL DEFAULT '';
ALTER TABLE memories ADD COLUMN reason TEXT NOT NULL DEFAULT '';
ALTER TABLE memories ADD COLUMN quote TEXT NOT NULL DEFAULT '';
