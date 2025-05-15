import * as cron from 'node-cron';
import { logger } from '../utils/logger';
import { processBatchMatching } from './matching.service';

// 예약된 작업 저장
const scheduledJobs: { [key: string]: cron.ScheduledTask } = {};

// 배치 매칭 작업 스케줄링 (10초마다 실행)
export function scheduleBatchMatching() {
  const jobName = 'batch-matching';
  
  // 이미 스케줄된 작업이 있으면 중지
  if (scheduledJobs[jobName]) {
    scheduledJobs[jobName].stop();
    delete scheduledJobs[jobName];
  }
  
  // 새 작업 스케줄링 (매 10초마다)
  const job = cron.schedule('*/10 * * * * *', async () => {
    logger.info('배치 매칭 스케줄러 실행 중...');
    
    try {
      const result = await processBatchMatching();
      logger.info(`배치 매칭 완료: ${result.matches}개 매칭 생성`);
    } catch (error) {
      logger.error('배치 매칭 실행 중 오류:', error);
    }
  });
  
  // 작업 저장 및 시작
  scheduledJobs[jobName] = job;
  job.start();
  
  logger.info('배치 매칭 스케줄러가 설정되었습니다 (매 10초마다 실행)');
  
  return job;
}

// 모든 스케줄된 작업 시작
export function startAllScheduledJobs() {
  Object.values(scheduledJobs).forEach(job => job.start());
  logger.info(`${Object.keys(scheduledJobs).length}개의 예약된 작업이 시작되었습니다`);
}

// 모든 스케줄된 작업 중지
export function stopAllScheduledJobs() {
  Object.values(scheduledJobs).forEach(job => job.stop());
  logger.info(`${Object.keys(scheduledJobs).length}개의 예약된 작업이 중지되었습니다`);
}

// 스케줄러 초기화 및 시작
export function initScheduler() {
  // 배치 매칭 스케줄링
  scheduleBatchMatching();
  
  // 추가 작업 스케줄링
  // 여기에 다른 예약 작업 추가
  
  logger.info('스케줄러가 초기화되었습니다');
} 