// Pass-through stub for 'stream/web' — browsers ship ReadableStream/WritableStream
// natively, so re-export the globals. Using web-streams-polyfill here breaks
// pipeThrough because the polyfill's classes are different prototypes from
// the native globals; mixing them throws "Failed to convert value to
// 'ReadableStream'".
export const ReadableStream = globalThis.ReadableStream
export const WritableStream = globalThis.WritableStream
export const TransformStream = globalThis.TransformStream
export const ByteLengthQueuingStrategy = globalThis.ByteLengthQueuingStrategy
export const CountQueuingStrategy = globalThis.CountQueuingStrategy
export const TextEncoderStream = globalThis.TextEncoderStream
export const TextDecoderStream = globalThis.TextDecoderStream
export default globalThis.ReadableStream
