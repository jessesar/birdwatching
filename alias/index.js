// pino-observatory.<subdomain>.workers.dev: the observatory's first address,
// kept so old links work. It hands every request to the birdwatching Worker,
// which does all the watching.
export default {
  fetch: (request, env) => env.BIRDWATCHING.fetch(request),
};
