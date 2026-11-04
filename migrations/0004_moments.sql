-- His state once a minute, for our own tests on him (sleep, rest, body).
CREATE TABLE moments (
  at TEXT PRIMARY KEY,          -- the API's own timestamp
  real_ms INTEGER NOT NULL,
  asleep INTEGER NOT NULL,
  town_min INTEGER,             -- null while he sleeps: his town shows no time then
  rest REAL,
  energy REAL,
  mood REAL,
  doing TEXT,
  thought TEXT
);

-- Indexes that keep the minute job cheap as the archive grows: the sighting
-- list reads entries marked at either level, the glimmer count reads hints.
CREATE INDEX entries_marked ON entries (at) WHERE tags != '' OR hints != '';
CREATE INDEX entries_hinted ON entries (at) WHERE hints != '';
