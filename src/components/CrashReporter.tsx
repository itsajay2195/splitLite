import { useEffect } from 'react';
import { useAlert } from './AlertProvider';
import { getPendingCrashReport, clearCrashReport } from '../utils/crashStorage';

export default function CrashReporter() {
  const { showAlert } = useAlert();

  useEffect(() => {
    const report = getPendingCrashReport();
    if (!report) return;

    showAlert({
      title: 'App crashed last time',
      message: 'Help us improve Baagam by sending an anonymous crash report? No personal data or expense details are included.',
      buttons: [
        {
          text: 'No Thanks',
          style: 'cancel',
          onPress: () => clearCrashReport(),
        },
        {
          text: 'Send Report',
          style: 'default',
          onPress: () => {
            // Sentry.captureException will replace this log later
            console.log('[CrashReport submitted]', {
              timestamp: report.timestamp,
              appVersion: report.appVersion,
              platform: report.platform,
              message: report.message,
              stack: report.stack,
              componentStack: report.componentStack,
            });
            clearCrashReport();
          },
        },
      ],
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
