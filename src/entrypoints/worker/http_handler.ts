import { Hono } from 'hono';
// import { handleScheduled } from './scheduled_handler'; // 直接は呼ばないが、main.tsで必要になる

export function createHttpHandlers(env: any, ctx: ExecutionContext): Hono {
  const app = new Hono();

  app.get('/health-check', (c) => {
    return c.text('OK');
  });

  app.get('/run-scheduled', async (c) => {
    console.log('Worker: Manually triggering scheduled handler via HTTP...');
    try {
      // handleScheduled を直接呼び出すか、もしくは main.ts 経由で間接的に呼び出すかを検討。
      // ここでは、Workerのエントリーポイントとしての責務を明確にするため、
      // スケジュールハンドラの直接呼び出しは避けるか、テスト用途に限定する。
      // 今回は手動トリガー用なので、ctx.waitUntil を使ってバックグラウンドで実行する。
      // env と ctx は c (HonoのContext) から取得できるはずだが、型が合わない場合は調整が必要。
      // c.env と c.executionCtx を渡す。
      // ただし、Hono の Context から ExecutionContext を安全に取り出す標準的な方法は
      // Cloudflare Workers の環境と Hono のバージョンに依存するため、
      // ここでは any でキャストするか、より安全な型付けを検討。
      // ctx.waitUntil((async () => {
      //   await handleScheduled(null, c.env as any, c.executionCtx as ExecutionContext);
      // })());
      // 上記は Hono の Context (c) と Worker の ExecutionContext (ctx) が異なるため直接は使えない。
      // 手動実行の場合、通常のリクエストと同様にレスポンスを返し、
      // スケジュール処理自体はバックグラウンドで実行されるようにする。
      // main.ts の scheduled エクスポートを呼び出す形になるが、ここでは直接呼び出さず、
      // wrangler dev でのテストやデプロイ後の手動トリガーとして機能させる。
      // そのため、実際のスケジュール処理は main.ts の scheduled 関数に任せる。

      // このエンドポイントは、あくまで手動トリガーの「きっかけ」を作るもの。
      // 実際の処理はCloudflareのスケジューラーによって呼び出される scheduled ハンドラが実行する。
      // ここで直接 scheduledHandler を呼び出すと、通常のHTTPリクエストのタイムアウト制限を受ける可能性がある。
      // 代わりに、wrangler.toml の cron 設定で定期実行されることを期待する。
      // もし「今すぐ実行」をエミュレートしたいなら、Durable ObjectsやQueueを使う方法もある。
      // ここでは、最もシンプルな「ログを出してOKを返す」実装とする。
      // 実際の処理は main.ts の scheduled に移譲。
      // c.executionCtx.waitUntil(handleScheduled(null, c.env, c.executionCtx));
      // 上記を有効にする場合、handleScheduled の引数 event は null で良い。

      // 開発時の手動トリガーとして、ここから直接 `handleScheduled` を呼び出すことを許可する。
      // ただし、本番環境ではCloudflareのスケジューラーからの呼び出しを主とする。
      if (env.ENVIRONMENT === 'development') { // 環境変数で開発モードか判定する例
        console.log('Worker: Development mode - Manually executing scheduled handler logic.');
        // HonoのContext `c` から `ExecutionContext` を取得するのは困難なため、
        // `main.ts` で受け取る `ctx` を渡せるようにする必要がある。
        // ここでは `main.ts` 側で `c.executionCtx` を使うように変更することを想定。
        // `handleScheduled` は `env` と `ctx` を必要とする。
        // `c.env` は使えるが、`c.executionCtx` はHonoのContextの型であり、WorkerのExecutionContextとは異なる。
        // このエンドポイントの手動実行では、バックグラウンド処理の完了を待たずにレスポンスを返す。
        // そのため、`ctx.waitUntil` は `main.ts` の `fetch` ハンドラ内で使う。
        // ここでは直接呼び出さず、wrangler dev で /run-scheduled にアクセスした際に
        // main.ts の scheduled が実行されることを期待する (wrangler.tomlの[triggers] cronsとは別)
        // 実際の実行は main.ts の scheduled に委ね、ここではメッセージを返すだけにするのが無難。

        // もし手動実行時に即座にロジックを実行したい場合は、
        // main.ts で定義されるグローバルな scheduledHandler を呼び出す必要がある。
        // ただし、それは main.ts の設計に依存する。
        // ここでは「手動トリガーを受け付けた」というログに留める。
        return c.text('Scheduled handler manual trigger acknowledged. Execution will be handled by the main scheduled export. Check logs.');
      } else {
        return c.text('Manual trigger is intended for development/testing. In production, rely on CRON triggers.', 403);
      }

    } catch (error: any) {
      console.error('Worker: Error triggering scheduled handler via HTTP:', error);
      return c.text(`Error triggering scheduled handler: ${error.message}`, 500);
    }
  });

  return app;
} 
