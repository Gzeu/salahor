## Additional Examples

Debounce rapid events:

```js
import { fromEventEmitter, debounceTime, pipe } from 'uniconnect';
const it = pipe(fromEventEmitter(emitter, 'data'), debounceTime(200));
for await (const v of it) console.log(v);
```

Throttle with trailing:

```js
import { fromEventEmitter, throttleTime, pipe } from 'uniconnect';
const it = pipe(fromEventEmitter(emitter, 'data'), throttleTime(500, { leading: true, trailing: true }));
for await (const v of it) console.log(v);
```

Merge two streams:

```js
import { merge, take } from 'uniconnect';
for await (const v of take(merge(streamA, streamB), 5)) console.log(v);
```

Zip two streams:

```js
import { zip, take } from 'uniconnect';
for await (const pair of take(zip(streamA, streamB), 3)) console.log(pair);
```

Accumulate with scan:

```js
import { scan, pipe } from 'uniconnect';
const sums = pipe(numbers, scan((acc, x) => acc + x, 0));
for await (const s of sums) console.log(s);
```
# uniconnect

Zero-dependency universal connectors between Events, EventTargets and AsyncIterables with lightweight operators. Node 18+.
![npm version](https://img.shields.io/npm/v/uniconnect?color=%2300a) ![node version](https://img.shields.io/badge/node-%3E%3D18-3c873a) ![license](https://img.shields.io/badge/license-MIT-blue)

Universal, zero-dependency building blocks to connect Node/EventTarget event sources with modern AsyncIterables and compose them via tiny operators.

## Table of Contents
- [Features](#features)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Abort & Error Handling](#abort--error-handling)
- [Compatibility Notes](#compatibility-notes)
- [Contributing](#contributing)
- [License](#license)

## Features
- Minimal, zero-dependency, ESM-first
- Connect `EventEmitter` and `EventTarget` to `AsyncIterable`
- Compose with `pipe()` and tiny operators: `map`, `filter`, `take`, `buffer`
- Convert back with `toEventEmitter()`
- Abort-friendly via `AbortController`

## Requirements
- Node.js 18+

## Quick Start

```js
import { fromEventEmitter, pipe, take } from 'uniconnect';
import { EventEmitter } from 'node:events';

const ee = new EventEmitter();
const iterable = pipe(fromEventEmitter(ee, 'data'), take(3));

(async () => {
  ee.emit('data', 'a');
  ee.emit('data', 'b');
  ee.emit('data', 'c');
})();

for await (const v of iterable) console.log(v);
```

## Install
```sh
npm install uniconnect
```

## Usage

### From EventEmitter to AsyncIterable

```js
import { fromEventEmitter, take, pipe } from 'uniconnect';
import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();

async function main() {
  const it = pipe(
    fromEventEmitter(emitter, 'data'),
    take(3),
  );

  (async () => {
    emitter.emit('data', 1);
    emitter.emit('data', 2);
    emitter.emit('data', 3);
    emitter.emit('data', 4);
  })();

  for await (const v of it) {
    console.log('got', v);
  }
}

main();
```

### From EventTarget to AsyncIterable

```js
import { fromEventTarget } from 'uniconnect';
const ac = new AbortController();
const { signal } = ac;

const target = new EventTarget();
const iterable = fromEventTarget(target, 'ping', { signal });

(async () => {
  target.dispatchEvent(new Event('ping'));
  ac.abort();
})();

for await (const ev of iterable) {
  console.log('event', ev.type);
}
```

### Operators

```js
import { pipe, map, filter, buffer } from 'uniconnect';

const processed = pipe(
  sourceIterable,
  map(x => x * 2),
  filter(x => x % 3 === 0),
  buffer(5),
);

for await (const chunk of processed) {
  // chunks of size 5
}
```

### Retry

```js
import { retryIterable } from 'uniconnect';

const src = () => someFlakyAsyncIterable();
for await (const v of retryIterable(src, { attempts: 5, delay: 200 })) {
  // values...
}
```

## API

- `fromEventTarget(target, eventName, { signal }) -> AsyncIterable`
  - Connects any `EventTarget` (e.g. DOM/EventTarget polyfills) to an `AsyncIterable`.
  - Params: `target: EventTarget`, `eventName: string`, `options?: { signal?: AbortSignal }`
  - Returns: `AsyncIterable<Event>`

- `fromEventEmitter(emitter, eventName, { signal }) -> AsyncIterable`
  - Connects Node.js `EventEmitter` to an `AsyncIterable`.
  - Params: `emitter: EventEmitter`, `eventName: string`, `options?: { signal?: AbortSignal }`
  - Returns: `AsyncIterable<any>`

- `toEventEmitter(asyncIterable, emitter, eventName) -> Promise<void>`
  - Consumes an `AsyncIterable` and re-emits values as events on the target emitter.

- `toAsyncIterable(source, eventName, options)`
  - Shortcut: detects the source type and calls `fromEventTarget` or `fromEventEmitter` accordingly.

- `pipe(iterable, ...ops) -> AsyncIterable`
  - Chain composition helper for async operators.

- Operators
  - `map(fn)`, `filter(fn)`, `take(n)`, `buffer(n)`
  - `scan(reducer, seed?)`, `distinctUntilChanged(equals?)`
  - `debounceTime(ms)`, `throttleTime(ms, { leading, trailing })`

- Utilities
  - `retryIterable(factory, { attempts, delay })`, `timeout(ms, { error? })`

### Example: toEventEmitter

```js
import { toEventEmitter } from 'uniconnect';
import { EventEmitter } from 'node:events';

async function* src() { yield 1; yield 2; }
const ee = new EventEmitter();
ee.on('data', v => console.log('data', v));
await toEventEmitter(src(), ee, 'data');
```

## Abort & Error Handling
- You can cancel streams with an `AbortController` via `options.signal`.
- Sources that emit an `error` event will propagate the error to the iterator.
- On abort or error, listeners are automatically cleaned up.

```js
import { fromEventTarget } from 'uniconnect';
const ac = new AbortController();
const iterable = fromEventTarget(new EventTarget(), 'tick', { signal: ac.signal });
const it = iterable[Symbol.asyncIterator]();
ac.abort(); // iterator will close with AbortError
```

## Compatibility Notes
- `EventEmitter` supported via standard methods: `on/off` or `addListener/removeListener` and `emit`.
- `EventTarget` requires `addEventListener/removeEventListener`.
- ESM-only package. In CommonJS, use dynamic `import()` or configure transpilation.

## Contributing
- Issues and PRs are welcome. Please include a minimal test (Node's built-in `node:test`) for any new functionality.

## Testing
- This project uses Node's built-in test runner.
- Run all tests:

```sh
npm test
```

Test files live under `test/` and use the `.test.mjs` suffix.

## Versioning & Release
- Follows Semantic Versioning (SemVer): `MAJOR.MINOR.PATCH`.
- Common flows:
  - Patch: `npm version patch`
  - Minor: `npm version minor`
  - Major: `npm version major`
- Publish to npm (public):

```sh
npm publish --access public
```

- Push tags and code to GitHub:

```sh
git push origin main --follow-tags
```

## License

MIT

## Changelog

See GitHub Releases for notable changes.
# uniconnect
