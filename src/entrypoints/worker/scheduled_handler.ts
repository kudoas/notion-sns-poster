import { AppConfig, loadAppConfig } from '../../infrastructure/config/config_service';
import { NotionApiRepository } from '../../infrastructure/persistence/notion_api_repository';
import { SchedulerUseCase } from '../../application/usecases/scheduler_usecase';

export async function handleScheduled(event: ScheduledEvent | null, env: any, ctx: ExecutionContext): Promise<void> {
  console.log('Worker: Scheduled event triggered!');

  try {
    // 設定の読み込み（環境変数から）
    const config: AppConfig = loadAppConfig(env);

    // リポジトリの初期化
    const notionRepository = new NotionApiRepository(config.notion);

    // ユースケースの初期化と実行
    const schedulerUseCase = new SchedulerUseCase(config, notionRepository);
    await schedulerUseCase.execute();

    console.log('Worker: Scheduled handler execution finished successfully.');
  } catch (error: any) {
    console.error('Worker: Error in scheduled handler:', error.message, error.stack);
    // 必要に応じてエラーを外部に通知する処理などを追加
    // (例: Sentryへの送信、アラートメールなど)
    // Cloudflare Worker の場合、エラーがスローされると自動的にログに記録されます。
    // ctx.waitUntil() で非同期処理が完了するのを待つため、ここでエラーを握りつぶさずに
    // 再スローするか、適切にハンドリングする必要があります。
    // 今回はログ出力に留め、Workerのデフォルトのエラーハンドリングに任せます。
  }
} 
