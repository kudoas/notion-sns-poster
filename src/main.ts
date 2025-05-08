/// <reference types="@cloudflare/workers-types" />
// import { Hono } from 'hono'; // createHttpHandlers が Hono インスタンスを返すのでここでは不要になる可能性

// 以前の直接参照していたモジュールは、新しいエントリーポイント経由で利用されるため削除
// import { loadAppConfig } from './config_service';
// import { NotionRepository } from './notion_repository';
// import { SchedulerUseCase } from './scheduler_usecase';

import { handleScheduled } from './entrypoints/worker/scheduled_handler';
import { createHttpHandlers } from './entrypoints/worker/http_handler';

// Hono アプリケーションのインスタンス作成は createHttpHandlers に移譲済み
// const app = new Hono() // entrypoints/worker/http_handler.ts で作成

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    // createHttpHandlers は Hono インスタンスを返す
    const app = createHttpHandlers(env, ctx);
    return app.fetch(request, env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(event, env, ctx));
  },
}; 
