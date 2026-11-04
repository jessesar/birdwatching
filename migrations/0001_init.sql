-- One reading of the town clock per minute, against our clock.
CREATE TABLE clock (
  at TEXT PRIMARY KEY,          -- the API's own timestamp for the reading
  real_ms INTEGER NOT NULL,
  town_day INTEGER NOT NULL,
  town_time TEXT NOT NULL,
  town_min INTEGER NOT NULL,    -- town_day * 1440 + minutes since midnight
  asleep INTEGER NOT NULL,
  doing TEXT
);

-- Everything in his feed; tags marks the tests an entry touches (",time,sky,").
CREATE TABLE entries (
  at TEXT NOT NULL,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  why TEXT,
  tags TEXT NOT NULL DEFAULT '',
  town TEXT,                    -- town day and time when we first saw it
  seen_at TEXT NOT NULL,
  PRIMARY KEY (at, kind, text)
);
CREATE INDEX entries_tagged ON entries (at) WHERE tags != '';

CREATE TABLE memories (
  text TEXT PRIMARY KEY,
  kind TEXT,
  since TEXT,
  tags TEXT NOT NULL DEFAULT '',
  first_seen TEXT NOT NULL
);

CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
