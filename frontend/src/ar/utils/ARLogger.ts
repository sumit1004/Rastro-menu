/**
 * @module ARLogger
 * @description Centralized logger for the engine to avoid raw console.log statements.
 * 
 * @dependencies ARConfig
 * @notes Architecture scaffolding only.
 */
export class ARLogger {
  static debug(msg: string, ...args: unknown[]) {}
  static info(msg: string, ...args: unknown[]) {}
  static warn(msg: string, ...args: unknown[]) {}
  static error(msg: string, ...args: unknown[]) {}
}
